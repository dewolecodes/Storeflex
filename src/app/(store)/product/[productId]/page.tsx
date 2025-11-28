"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getOneProduct } from "@/actions/product/product";
import Gallery from "@/domains/product/components/gallery";
import ProductBoard from "@/domains/product/components/productBoard";
import ProductCard from "@/domains/product/components/productCard";
import { TopProducts } from "@/domains/product/constants";
import { LikeIcon, MinusIcon } from "@/shared/components/icons/svgIcons";
import { SK_Box } from "@/shared/components/UI/skeleton";
import { TProductPageInfo } from "@/shared/types/product";

const ProductPage = () => {
  const router = useRouter();
  const { productId } = useParams<{ productId: string[] }>();
  const [productInfo, setProductInfo] = useState<TProductPageInfo | null | undefined>(null);
  if (!productId) router.push("/");

  useEffect(() => {
    const getProductFromDB = async () => {
      const response = await getOneProduct(productId.toString());
      if (response.error) router.push("/");
      setProductInfo(response.res);
    };
    getProductFromDB();
  }, [productId, router]);

  if (productInfo === undefined) return "";
  let fullPath = "";

  return (
    <div className="storeContainer">
      <div className="w-full h-auto mt-[120px] sm:mt-[80px] px-2 sm:px-4 md:px-6 flex flex-col">
        <div className="w-full flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-12 px-0">
          <div className="flex-grow">
            <div className="block text-gray-700 w-full mb-6 sm:mb-10 text-xs sm:text-sm">
              {productInfo ? (
                <>
                  <Link href={"/"} className="hover:font-medium after:mx-1 after:content-['/'] hover:text-gray-800">
                    Home
                  </Link>
                  {productInfo.path.map((item, index) => {
                    fullPath += "/" + item.url;
                    return (
                      <Link
                        key={item.url + index}
                        href={"/list" + fullPath}
                        className="after:content-['/'] last:after:content-[''] after:mx-1 hover:text-gray-800"
                      >
                        {item.name}
                      </Link>
                    );
                  })}
                </>
              ) : (
                <SK_Box width="60%" height="15px" />
              )}
            </div>
            <Gallery images={productInfo?.images} />
          </div>
          <div className="lg:w-[512px] w-full">
            {productInfo ? (
              <ProductBoard
                boardData={{
                  id: productInfo.id,
                  isAvailable: productInfo.isAvailable,
                  defaultQuantity: 1,
                  name: productInfo.name,
                  price: productInfo.price,
                  dealPrice: productInfo.salePrice || undefined,
                  shortDesc: productInfo.desc || "",
                  specialFeatures: productInfo.specialFeatures,
                }}
              />
            ) : (
              <div className="flex flex-col">
                <SK_Box width="60%" height="14px" />
                <div className="flex flex-col mt-10 gap-5">
                  <SK_Box width="40%" height="30px" />
                  <SK_Box width="90%" height="16px" />
                </div>
                <div className="flex flex-col gap-4 mt-10">
                  <SK_Box width="40%" height="14px" />
                  <SK_Box width="40%" height="14px" />
                  <SK_Box width="40%" height="14px" />
                </div>
                <div className="flex flex-col gap-4 mt-16">
                  <SK_Box width="30%" height="40px" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="w-full h-auto flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-12 mt-6 sm:mt-10">
          <div className="w-full flex flex-col">
            {/* ----------------- SPECIFICATION SECTION ----------------- */}
            <div className="w-full mb-8 sm:mb-[100px]">
              <h2 className="font-light block text-xl sm:text-2xl text-gray-900 py-3 sm:py-5 border-b border-gray-300">Specification</h2>
              {productInfo ? (
                productInfo.specifications.map((spec, index) => (
                  <section key={index} className="w-full py-3 sm:py-5 border-b border-gray-300">
                    <div className="flex items-center w-full">
                      <button className="size-8 inline-block relative border-none bg-white rounded-sm hover:bg-gray-200">
                        <MinusIcon width={12} className="absolute top-3.5 left-2.5 stroke-gray-700" />
                      </button>
                      <h3 className="ml-2 sm:ml-3 inline-block text-xs sm:text-sm text-gray-700">{spec.groupName}</h3>
                    </div>
                    {spec.specs.map((row, index) => (
                      <div
                        key={index}
                        className="w-full pt-2 sm:pt-3 flex flex-col sm:flex-row items-start sm:items-stretch gap-2 sm:gap-0 bg-white text-xs sm:text-sm rounded-lg hover:bg-gray-100"
                      >
                        <div className="min-w-[120px] sm:min-w-[160px] flex items-start ml-0 sm:ml-[42px] text-gray-500">
                          <span>{row.name}</span>
                        </div>
                        <div className="font-medium text-gray-800">
                          <span key={index} className="block leading-5 min-h-8 h-auto">
                            {row.value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </section>
                ))
              ) : (
                <>
                  <div className="flex flex-col mt-4 mb-8 sm:mb-16 gap-4">
                    <SK_Box width="200px" height="30px" />
                    <div className={"flex gap-2 sm:gap-5 items-center ml-0 sm:ml-10"}>
                      <SK_Box width="10%" height="20px" />
                      <SK_Box width="40%" height="16px" />
                    </div>
                    <div className={"flex gap-2 sm:gap-5 items-center ml-0 sm:ml-10"}>
                      <SK_Box width="10%" height="20px" />
                      <SK_Box width="40%" height="16px" />
                    </div>
                  </div>
                  <div className="flex flex-col mt-4 mb-8 sm:mb-16 gap-4">
                    <SK_Box width="200px" height="30px" />
                    <div className={"flex gap-2 sm:gap-5 items-center ml-0 sm:ml-10"}>
                      <SK_Box width="10%" height="20px" />
                      <SK_Box width="40%" height="16px" />
                    </div>
                    <div className={"flex gap-2 sm:gap-5 items-center ml-0 sm:ml-10"}>
                      <SK_Box width="10%" height="20px" />
                      <SK_Box width="40%" height="16px" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ----------------- USER REVIEWS ----------------- */}
            <div className="flex flex-col w-full h-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 sm:pb-4 border-b border-gray-300 gap-3 sm:gap-0">
                <h2 className="font-light block text-xl sm:text-2xl text-gray-900">User Reviews</h2>
                <button className="text-xs sm:text-sm text-gray-900 px-4 sm:px-6 py-1.5 rounded-md bg-gray-100 border border-gray-700 hover:bg-gray-200 active:bg-light-300">
                  New Review
                </button>
              </div>
              <div className="flex flex-col w-full">
                <div className="flex items-center flex-wrap w-full mt-5 text-sm">
                  <div className="flex h-8 items-center text-gray-800 font-medium">
                    <Image
                      src={"/images/images/defaultUser.png"}
                      className="rounded-full overflow-hidden mr-3"
                      alt=""
                      width={32}
                      height={32}
                    />
                    <span>T. Mihai</span>
                  </div>
                  <span className="text-[#f97a1f] ml-8 font-medium">Verified Purchase</span>
                  <div>
                    <div className="inline-block ml-8 pl-6 bg-[url('/icons/dateIcon.svg')] bg-no-repeat bg-[position:left_center]">
                      30 November 2023
                    </div>
                    <div className="ml-10 inline-block">
                      <button className="h-8 mr-3 font-medium px-3 bg-white border border-white rounded-md text-gray-900 hover:border-green-600 hover:bg-green-800 hover:[&>svg]:fill-green-700 active:border-green-500 active:[&>svg]:fill-green-600">
                        <LikeIcon width={16} className="fill-white stroke-gray-1000 mr-2" />0
                      </button>
                      <button className="h-8 mr-3 font-medium px-3 bg-white border border-white rounded-md text-gray-900 hover:border-red-700 hover:bg-[rgba(220,38,38,0.4)] hover:[&>svg]:fill-red-800 active:border-red-500 active:[&>svg]:fill-red-700 [&>svg]:inline-block [&>svg]:[-scale-x-100] [&>svg]:rotate-180 [&>svg]:-translate-y-[3px]">
                        <LikeIcon width={16} className="fill-white stroke-gray-1000 mr-2" /> 0
                      </button>
                    </div>
                  </div>
                </div>
                <div className="my-2 sm:my-4 ml-6 sm:ml-12 text-xs sm:text-sm leading-5 text-gary-900">
                  <span>
                    {`Lorem ipsum dolor sit amet consectetur adipisicing elit. 
                    Temporibus suscipit debitis reiciendis repellendus! Repellat rem beatae quo quis 
                    tenetur. Culpa quae ratione delectus id odit in nesciunt saepe pariatur vitae.`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full my-8 sm:my-[40px] lg:my-[100px]">
          <h2 className="font-light block text-lg sm:text-2xl text-gray-900 mb-4">Similar Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:flex justify-between gap-2 sm:gap-3.5 w-full pb-2">
            {TopProducts.map((product, index) => (
              <ProductCard
                key={index}
                imgUrl={product.imgUrl}
                name={product.name}
                price={product.price}
                specs={product.specs}
                url={product.url}
                dealPrice={product.dealPrice}
                staticWidth
              />
            ))}
          </div>
        </div>
      </div>
      {/* Mobile sticky action bar */}
      <div className="lg:hidden fixed bottom-3 left-0 right-0 px-3">
        <div className="max-w-[980px] mx-auto bg-white rounded-lg p-2 sm:p-3 shadow-md flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-medium truncate">{productInfo?.name}</span>
            <span className="text-xs text-gray-600">€{productInfo?.price}</span>
          </div>
          <button className="bg-green-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm whitespace-nowrap">Add to cart</button>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
