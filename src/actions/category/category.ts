"use server";
import { z } from "zod";

import { db } from "@/shared/lib/db";
import { TCategory, TGroupJSON } from "@/shared/types/categories";

//eslint-disable-next-line
const GetAllCategories = z.object({
  id: z.string(),
  parentID: z.string().min(6).nullable(),
  name: z.string().min(3),
  url: z.string().min(3),
  iconSize: z.array(z.number().int()),
  iconUrl: z.string().min(3).nullable(),
});

const AddCategory = z.object({
  parentID: z.string().min(6).nullable(),
  name: z.string().min(3),
  url: z.string().min(3),
  iconSize: z.array(z.number().int()),
  iconUrl: z.string().min(3).nullable(),
});

const UpdateCategory = z.object({
  id: z.string(),
  name: z.string().min(3).optional(),
  url: z.string().min(3).optional(),
  iconSize: z.array(z.number().int()),
  iconUrl: z.string().min(3).optional(),
});

export type TGetAllCategories = z.infer<typeof GetAllCategories>;
export type TAddCategory = z.infer<typeof AddCategory>;
export type TUpdateCategory = z.infer<typeof UpdateCategory>;

const convertToJson = (categoriesTable: TCategory[]): TGroupJSON[] => {
  const generateCategoryGroups = (categoriesTable: TCategory[]): TGroupJSON[] => {
    return categoriesTable.filter((tableRow) => tableRow.parentID === null).map((group) => ({ group, categories: [] }));
  };

  const fillCategoryArray = (groups: TGroupJSON[], categoriesTable: TCategory[]) => {
    groups.forEach((group) => {
      group.categories = getChildren(categoriesTable, group.group.id).map((category) => ({
        category,
        subCategories: [],
      }));
    });
  };

  const fillSubCategoryArray = (groups: TGroupJSON[], categoriesTable: TCategory[]) => {
    groups.forEach((group) => {
      group.categories.forEach((category) => {
        category.subCategories = getChildren(categoriesTable, category.category.id);
      });
    });
  };

  const getChildren = (array: TCategory[], parentID: string | null): TCategory[] => {
    return array.filter((item) => item.parentID === parentID);
  };

  const groups: TGroupJSON[] = generateCategoryGroups(categoriesTable);
  fillCategoryArray(groups, categoriesTable);
  fillSubCategoryArray(groups, categoriesTable);

  return groups;
};

export const getAllCategories = async (tenantId?: string) => {
  try {
    const result: TGetAllCategories[] = await db.category.findMany({
      where: tenantId ? { tenantId } : undefined,
    });

    if (!result) return { error: "Can't read categories" };
    return { res: result };
  } catch {
    return { error: "Cant read Category Groups" };
  }
};
export const getAllCategoriesJSON = async (tenantId?: string) => {
  try {
    const result: TCategory[] = await db.category.findMany({
      where: tenantId ? { tenantId } : undefined,
    });

    if (!result) return { error: "Can't read categories" };
    return { res: convertToJson(result) };
  } catch {
    return { error: "Cant read Category Groups" };
  }
};

export const addCategory = async (data: TAddCategory, tenantId?: string) => {
  if (!AddCategory.safeParse(data).success) return { error: "Invalid Data!" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = {
      parentID: data.parentID,
      name: data.name,
      url: data.url,
      slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''),
      iconSize: [...data.iconSize],
      iconUrl: data.iconUrl,
    };
    if (tenantId) createData.tenantId = tenantId;

    const result = await db.category.create({
      data: createData,
    });
    if (!result) return { error: "cant add to database" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const updateCategory = async (data: TUpdateCategory, tenantId?: string) => {
  if (!UpdateCategory.safeParse(data).success) return { error: "Data is no valid" };

  const { id, iconSize, ...values } = data;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    const result = await db.category.update({
      where,
      data: {
        iconSize: [...iconSize],
        ...values,
      },
    });
    if (result) return { res: result };
    return { error: "Can't update it" };
  } catch (error) {
    return {
      error: JSON.stringify(error),
    };
  }
};

export const deleteCategory = async (id: string, tenantId?: string) => {
  if (!id) return { error: "Can't delete it!" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereChild: any = { parentID: id };
    if (tenantId) whereChild.tenantId = tenantId;
    const hasParent = await db.category.findFirst({
      where: whereChild,
    });
    if (!hasParent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereDelete: any = { id };
      if (tenantId) whereDelete.tenantId = tenantId;
      const result = await db.category.delete({
        where: whereDelete,
      });

      if (!result) return { error: "Can't delete it!" };
      return { res: JSON.stringify(result) };
    }
    return { error: "It has child!" };
  } catch {
    return { error: "Can't delete it!" };
  }
};
