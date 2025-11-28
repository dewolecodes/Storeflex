"use client";

import { getSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { TGetAllCategories, getAllCategories } from "@/actions/category/category";
import AddCategoryGroup from "@/domains/admin/components/category/addCategoryGroup";
import CatGroupRow from "@/domains/admin/components/category/rowGroup";

const AdminCategories = () => {
  const [allCategories, setAllCategories] = useState<TGetAllCategories[]>([]);
  const [currentTenantId, setCurrentTenantId] = useState<string>("");

  const getData = async (tenantId?: string) => {
    const data = await getAllCategories(tenantId);
    if (data.res) setAllCategories(data.res);
  };

  useEffect(() => {
    const fetchTenantId = async () => {
      const session = await getSession();
      if (session?.user && typeof session.user === 'object' && 'tenantId' in session.user) {
        const tenantId = session.user.tenantId as string;
        setCurrentTenantId(tenantId);
        await getData(tenantId);
      }
    };

    fetchTenantId();
  }, []);

  const groups: TGetAllCategories[] = [];
  const categories: TGetAllCategories[] = [];

  if (allCategories.length > 0) {
    allCategories.forEach((cat) => {
      if (cat.parentID) {
        categories.push(cat);
        return;
      }

      groups.push(cat);
    });
  }
  return (
    <div className="flex flex-col">
      <div className="w-full mt-3 flex gap-4 items-center">
        <h3 className="text-xl font-light text-gray-600">Add a main group:</h3>
        <AddCategoryGroup onReset={() => getData(currentTenantId)} />
      </div>
      <div className="mt-6">
        {groups.length > 0 &&
          groups.map((group) => (
            <div className="mb-8 rounded-lg border border-gray-200" key={group.id}>
              <CatGroupRow onReset={() => getData(currentTenantId)} data={group} categories={categories} tenantId={currentTenantId} />
            </div>
          ))}
      </div>
    </div>
  );
};

export default AdminCategories;
