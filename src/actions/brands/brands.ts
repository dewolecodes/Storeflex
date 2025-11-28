"use server";
import { z } from "zod";

import { db } from "@/shared/lib/db";
import { TBrand } from "@/shared/types";

const ValidateUpdateBrand = z.object({
  id: z.string().min(6),
  name: z.string().min(3),
});

export const addBrand = async (brandName: string, tenantId?: string) => {
  if (!brandName || brandName === "") return { error: "Invalid Data!" };

  try {
    const slug = brandName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createData: any = { name: brandName, slug };
    if (tenantId) createData.tenantId = tenantId;
    const result = await db.brand.create({
      data: createData,
    });
    if (!result) return { error: "Can't Insert Data" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const getAllBrands = async (tenantId?: string) => {
  try {
    const result: TBrand[] | null = await db.brand.findMany(
      tenantId ? { where: { tenantId } } : undefined
    );

    if (!result) return { error: "Can't Get Data from Database!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const deleteBrand = async (brandID: string, tenantId?: string) => {
  if (!brandID || brandID === "") return { error: "Invalid Data!" };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id: brandID };
    if (tenantId) where.tenantId = tenantId;
    const result = await db.brand.delete({
      where,
    });

    if (!result) return { error: "Can't Delete!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};

export const updateBrand = async (data: TBrand & { tenantId?: string }) => {
  if (!ValidateUpdateBrand.safeParse(data).success) return { error: "Invalid Data!" };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { id: data.id };
    if (data.tenantId) where.tenantId = data.tenantId;
    const result = await db.brand.update({
      where,
      data: {
        name: data.name,
      },
    });

    if (!result) return { error: "Can't Update!" };
    return { res: result };
  } catch (error) {
    return { error: JSON.stringify(error) };
  }
};
