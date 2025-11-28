"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { TTrafficListItem, deleteTraffic, getTrafficReport } from "@/actions/pageVisit/pageVisitServices";
import Button from "@/shared/components/UI/button";
import { SK_Box } from "@/shared/components/UI/skeleton";
import { Pagination } from "@/shared/components/UI/table/pagination";
import { TRAFFIC_LIST_PAGE_SIZE } from "@/shared/constants/admin/trafficView";
import { getFullTimeString } from "@/shared/utils/formatting/time";
import { cn } from "@/shared/utils/styling";
import { calculateTablePagination } from "@/shared/utils/tablesCalculation";

const TrafficView = () => {
  const [trafficList, setTrafficList] = useState<TTrafficListItem[]>([]);
  const { pageNumber } = useParams<{ pageNumber: string }>();
  const pageNumberInt = Number(pageNumber);

  const [totalNumber, setTotalNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getTraffic = useCallback(async () => {
    setIsLoading(true);

    const currentPage = Number(pageNumber);

    if (isNaN(currentPage)) {
      setIsLoading(false);
      throw new Error("Page number is not valid");
    }

    const response = await getTrafficReport((currentPage - 1) * 20);

    if (response.error) {
      setIsLoading(false);
      throw new Error(response.error);
    }

    if (response?.res?.list && response?.res?.totalCount) {
      setTrafficList(response.res.list);
      setTotalNumber(response.res.totalCount);
    }

    setIsLoading(false);
  }, [pageNumber]);

  useEffect(() => {
    getTraffic();
  }, [getTraffic]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const response = await deleteTraffic(id);

    if (response.res) {
      getTraffic();
    }

    setDeletingId(null);
  };

  const paginationList = calculateTablePagination(totalNumber, pageNumberInt, TRAFFIC_LIST_PAGE_SIZE, 10);

  return (
    <div className="text-sm text-gray-800 flex flex-col">
      <span className="mb-4">Total visits: {totalNumber || 0}</span>
      {isLoading ? (
        <div className="grid grid-cols-12 items-center justify-between gap-4 p-3 rounded-lg bg-gray-50">
          <SK_Box width="100%" height="16px" />
          <SK_Box width="100%" height="16px" />
          <SK_Box width="100%" height="16px" />
        </div>
      ) : trafficList.length ? (
        <div className="flex flex-col">
          {trafficList.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center justify-between gap-3 p-3 rounded-lg even:bg-gray-100"
            >
              <span className="sm:w-[180px] sm:col-span-2 text-sm sm:text-center py-1 bg-white rounded-md border border-gray-400 px-2">
                {item.time ? getFullTimeString(item.time) : ""}
              </span>
              <span className="sm:w-[160px] sm:col-span-2 text-sm text-gray-600 sm:text-center py-1 rounded-md border border-gray-300 px-2">
                {item.pageType}
              </span>
              <span className="sm:col-span-2 break-words truncate px-2">{item.pagePath}</span>
              <div className="sm:w-[110px] sm:col-span-2 text-sm text-center py-1 rounded-md border border-gray-400 px-2">
                {item.deviceResolution}
              </div>
              <div className="sm:col-span-3 px-2 text-sm">
                {item.product && item.product?.category.name + " / " + item.product?.name}
              </div>
              <div className="px-2 mt-2 sm:mt-0">
                <Button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className={cn({ "opacity-50": deletingId === item.id })}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          <Pagination currentPage={pageNumberInt} routeBase="/admin/trafficView/" pagesList={paginationList} />
        </div>
      ) : (
        <div>There is no traffic data</div>
      )}
    </div>
  );
};

export default TrafficView;
