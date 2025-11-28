"use server";
import { ProductSpec } from "@prisma/client";
import { z } from "zod";

import { db } from "@/shared/lib/db";
import {
  TAddProductFormValues,
  TCartListItemDB,
  TPath,
  TProductListItem,
  TProductPageInfo,
  TSpecification,
} from "@/shared/types/product";

const ValidateAddProduct = z.object({
  name: z.string().min(3),
  tenantId: z.string().min(6),
  brandID: z.string().min(6),
  specialFeatures: z.array(z.string()),
  desc: z.string().optional(),
  shortDescription: z.string().optional(),
  stock: z.string().optional(),
  images: z.array(z.string()),
  categoryID: z.string().min(6),
  price: z.string().min(1),
  salePrice: z.string(),
  specifications: z.array(
    z.object({
      specGroupID: z.string().min(6),
      specValues: z.array(z.string()),
    })
  ),
});

const convertStringToFloat = (str: string) => {
  str.replace(/,/, ".");
  return str ? parseFloat(str) : 0.0;
};

export const addProduct = async (data: TAddProductFormValues) => {
  // Validate tenant context first — products must belong to a tenant.
  if (!data.tenantId || data.tenantId === "") return { error: "Missing tenantId: products must be created under a tenant." };

  if (!ValidateAddProduct.safeParse(data).success) return { error: "Invalid Data!" };

  try {
    const price = convertStringToFloat(data.price);
    const salePrice = data.salePrice ? convertStringToFloat(data.salePrice) : null;
    const tenantId = data.tenantId as string; // Validated above

    const result = await (async () => {
      // Prisma's generated types for nested creates with custom types can be
      // complex; use a targeted ts-expect-error to allow the create while
      // keeping the surrounding function typed.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Prisma nested create typings are complex in this project; allow this call
      return await db.category.update({
        where: { id: data.categoryID },
        data: {
          products: {
            create: {
              name: data.name,
              description: data.desc,
              shortDescription: data.shortDescription,
              stock: data.stock ? parseInt(data.stock) : undefined,
              brandID: data.brandID,
              specialFeatures: data.specialFeatures,
              isAvailable: data.isAvailable,
              price: price,
              salePrice: salePrice,
              images: [...data.images],
              specs: data.specifications,
              tenantId: tenantId,
              slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
            },
          },
        },
      });
    })();
    if (!result) return { error: "Can't Insert Data" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const updateProduct = async (productId: string, data: Partial<TAddProductFormValues> & { tenantId?: string }) => {
  if (!productId || productId === "") return { error: "Invalid Product ID" };
  if (!data.tenantId || data.tenantId === "") return { error: "Missing tenantId" };

  try {
    // First verify the product belongs to this tenant
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const existingProduct = await db.product.findFirst({
      where: { id: productId, tenantId: data.tenantId },
      select: { id: true },
    });

    if (!existingProduct) {
      return { error: "Product not found or does not belong to your tenant" };
    }

    // Build a data object that maps only to writable scalar fields on Product.
    // NOTE: `specs` is a relation (ProductSpec[]) and cannot be assigned directly here
    // without nested writes. For now we avoid updating specs via this action.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (typeof data.name === 'string') updateData.name = data.name;
    if (typeof data.desc === 'string') updateData.description = data.desc;
    if (typeof data.shortDescription === 'string') updateData.shortDescription = data.shortDescription;
    if (typeof data.brandID === 'string') updateData.brandID = data.brandID;
    if (typeof data.images !== 'undefined') updateData.images = data.images;
    if (typeof data.price === 'string') updateData.price = convertStringToFloat(data.price);
    if (typeof data.salePrice === 'string') updateData.salePrice = data.salePrice ? convertStringToFloat(data.salePrice) : null;
    if (typeof data.stock === 'string') updateData.stock = data.stock ? parseInt(data.stock) : undefined;
    if (typeof data.isAvailable === 'boolean') updateData.isAvailable = data.isAvailable;
    if (typeof data.specialFeatures !== 'undefined') updateData.specialFeatures = data.specialFeatures;

    // Update the product by id only (already verified tenant scoping above)
    const res = await db.product.update({
      where: { id: productId },
      data: updateData,
    });

    return { res };
  } catch (e) {
    return { error: JSON.stringify(e) };
  }
};

export const getAllProducts = async (tenantId?: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Prisma typing for where filters with tenantId
    const result: TProductListItem[] | null = await db.product.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true,
        name: true,
        price: true,
        salePrice: true,
        description: true,
        shortDescription: true,
        images: true,
        stock: true,
        isAvailable: true,
        brandID: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!result) return { error: "Can't Get Data from Database!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const getOneProduct = async (productID: string) => {
  if (!productID || productID === "") return { error: "Invalid Product ID!" };

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Prisma select typing
    const result = await db.product.findFirst({
      where: {
        id: productID,
      },
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        price: true,
        salePrice: true,
        specs: true,
        specialFeatures: true,
        isAvailable: true,
        optionSets: true,
        categoryID: true,
      },
    });
    if (!result) return { error: "Invalid Data!" };

    const specifications = await generateSpecTable(result.specs);
    if (!specifications || specifications.length === 0) return { error: "Invalid Date" };

    const categoryData = await db.category.findFirst({ where: { id: result.categoryID }, select: { id: true, parentID: true } });
    const pathArray: TPath[] | null = await getPathByCategoryID(categoryData?.id ?? '', categoryData?.parentID ?? null);
    if (!pathArray || pathArray.length === 0) return { error: "Invalid Date" };

    const { description, ...others } = result as { specs?: ProductSpec[]; description?: string | null } & Record<string, unknown>;
    const mergedResult = {
      ...others,
      desc: (description ?? null) as string | null,
      specifications,
      path: pathArray,
    } as unknown as TProductPageInfo;

    return { res: mergedResult };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const getCartProducts = async (productIDs: string[]) => {
  if (!productIDs || productIDs.length === 0) return { error: "Invalid Product List" };

  try {
    const result: TCartListItemDB[] | null = await db.product.findMany({
      where: {
        id: { in: productIDs },
      },
      select: {
        id: true,
        name: true,
        images: true,
        price: true,
        salePrice: true,
      },
    });

    if (!result) return { error: "Can't Get Data from Database!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const deleteProduct = async (productID: string, tenantId?: string) => {
  if (!productID || productID === "") return { error: "Invalid Data!" };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id: productID };
    if (tenantId) where.tenantId = tenantId;
    const result = await db.product.delete({
      where,
    });

    if (!result) return { error: "Can't Delete!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

const generateSpecTable = async (rawSpec: ProductSpec[]) => {
  try {
    const specGroupIDs = rawSpec.map((spec) => spec.specGroupID);

    const result = await db.specGroup.findMany({
      where: {
        id: { in: specGroupIDs },
      },
    });
    if (!result || result.length === 0) return null;

    const specifications: TSpecification[] = [];

    rawSpec.forEach((spec) => {
      const groupSpecIndex = result.findIndex((g) => g.id === spec.specGroupID);
      const tempSpecs: { name: string; value: string }[] = [];
      spec.specValues.forEach((s, index) => {
        tempSpecs.push({
          name: result[groupSpecIndex].specs[index] || "",
          value: s || "",
        });
      });

      specifications.push({
        groupName: result[groupSpecIndex].title || "",
        specs: tempSpecs,
      });
    });
    if (specifications.length === 0) return null;

    return specifications;
  } catch {
    return null;
  }
};

const getPathByCategoryID = async (categoryID: string, parentID: string | null) => {
  try {
    if (!categoryID || categoryID === "") return null;
    if (!parentID || parentID === "") return null;
    const result: TPath[] = await db.category.findMany({
      where: {
        OR: [{ id: categoryID }, { id: parentID }, { parentID: null }],
      },
      select: {
        id: true,
        parentID: true,
        name: true,
        url: true,
      },
    });
    if (!result || result.length === 0) return null;

    const path: TPath[] = [];
    let tempCatID: string | null = categoryID;
    let searchCount = 0;

    const generatePath = () => {
      const foundCatIndex = result.findIndex((cat) => cat.id === tempCatID);
      if (foundCatIndex === -1) return;
      path.unshift(result[foundCatIndex]);
      tempCatID = result[foundCatIndex].parentID;
      if (!tempCatID) return;
      searchCount++;
      if (searchCount <= 3) generatePath();
      return;
    };
    generatePath();

    if (!path || path.length === 0) return null;
    return path;
  } catch {
    return null;
  }
};
