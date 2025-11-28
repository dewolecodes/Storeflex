"use client";

import { ProductSpec, SpecGroup } from "@prisma/client";
import { useEffect, useState } from "react";

import { getAllBrands } from "@/actions/brands/brands";
import { getAllCategoriesJSON } from "@/actions/category/category";
import { getCategorySpecs } from "@/actions/category/specifications";
import DropDownList from "@/shared/components/UI/dropDown";
import Input from "@/shared/components/UI/input";
import MultiImageUploader from "@/shared/components/UI/MultiImageUploader";
import { TBrand } from "@/shared/types";
import { TGroupJSON } from "@/shared/types/categories";
import { TAddProductFormValues } from "@/shared/types/product";
import { TDropDown } from "@/shared/types/uiElements";
import { cn } from "@/shared/utils/styling";

const categoryListFirstItem: TDropDown = {
  text: "Select A Category....",
  value: "",
};

const brandListFirstItem: TDropDown = {
  text: "Select A Brand....",
  value: "",
};

type TProps = {
  formValues: TAddProductFormValues;
  onFormChange: (props: TAddProductFormValues) => void;
  tenantId?: string;
};

const ProductForm = ({ formValues: props, onFormChange, tenantId }: TProps) => {
  const [categoryList, setCategoryList] = useState<TDropDown[]>([categoryListFirstItem]);
  const [brandList, setBrandList] = useState<TDropDown[]>([brandListFirstItem]);
  const [selectedCategoryListIndex, setSelectedCategoryListIndex] = useState(0);
  const [selectedBrandListIndex, setSelectedBrandListIndex] = useState(0);

  const [categorySpecs, setCategorySpecs] = useState<SpecGroup[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const result = await getAllCategoriesJSON(tenantId);
      if (result.res) {
        setCategoryList(convertJSONtoDropdownList(result.res));
      }
    };

    const fetchBrands = async () => {
      const result = await getAllBrands(tenantId);
      if (result.res) {
        setBrandList(convertBrandsToDropdownList(result.res));
      }
    };

    const convertJSONtoDropdownList = (json: TGroupJSON[]): TDropDown[] => {
      const dropDownData: TDropDown[] = [categoryListFirstItem];
      json.forEach((group) => {
        dropDownData.push({
          text: group.group.name,
          value: group.group.id,
        });
        group.categories.forEach((category) => {
          dropDownData.push({
            text: group.group.name + " - " + category.category.name,
            value: category.category.id,
          });
          category.subCategories.forEach((sub) => {
            dropDownData.push({
              text: group.group.name + " - " + category.category.name + " - " + sub.name,
              value: sub.id,
            });
          });
        });
      });

      return dropDownData;
    };

    const convertBrandsToDropdownList = (brandList: TBrand[]): TDropDown[] => {
      const dropDownData: TDropDown[] = [brandListFirstItem];
      brandList.forEach((brand) => {
        dropDownData.push({
          text: brand.name,
          value: brand.id,
        });
      });

      return dropDownData;
    };

    fetchCategories();
    fetchBrands();
  }, [tenantId]);

  const handleCategoryChange = (index: number) => {
    setSelectedCategoryListIndex(index);
    if (index === 0) {
      onFormChange({
        ...props,
        specifications: JSON.parse(JSON.stringify(props.specifications)),
        categoryID: "",
      });
      setCategorySpecs([]);
    } else {
      getSpecGroup(categoryList[index].value);
    }
  };

  const handleBrandChange = (index: number) => {
    setSelectedBrandListIndex(index);
    onFormChange({ ...props, brandID: brandList[index].value });
  };

  const getSpecGroup = async (categoryID: string) => {
    const response = await getCategorySpecs(categoryID);
    if (response.res) {
      const specArray: ProductSpec[] = [];
      response.res.forEach((item) => {
        specArray.push({
          specGroupID: item.id,
          specValues: item.specs.map(() => ""),
        });
      });
      onFormChange({
        ...props,
        specifications: JSON.parse(JSON.stringify(specArray)),
        categoryID: categoryID,
      });
      setCategorySpecs(response.res);
    }
  };

  const handleSpecialFeatureChange = (index: number, value: string) => {
    const newArray = [...props.specialFeatures];
    newArray[index] = value;
    onFormChange({ ...props, specialFeatures: newArray });
  };

  return (
    <div className="flex flex-col overflow-y-scroll p-6 rounded-xl bg-white z-10 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="whitespace-nowrap">Name:</span>
          <Input
            type="text"
            className="w-full sm:w-[200px]"
            value={props.name}
            placeholder="Name..."
            onChange={(e) =>
              onFormChange({
                ...props,
                name: e.currentTarget.value,
              })
            }
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="whitespace-nowrap">Short Descriptions:</span>
          <Input
            type="text"
            className="w-full sm:w-[200px]"
            value={props.shortDescription ?? props.desc ?? ""}
            onChange={(e) =>
              onFormChange({
                ...props,
                shortDescription: e.currentTarget.value,
              })
            }
            placeholder="Short Description..."
          />
        </div>
        <div className="flex flex-col">
          <span className="whitespace-nowrap">Special Features:</span>
          <div className="flex flex-col gap-2 mt-2">
            <Input
              type="text"
              value={props.specialFeatures[0]}
              onChange={(e) => handleSpecialFeatureChange(0, e.currentTarget.value)}
            />
            <Input
              type="text"
              value={props.specialFeatures[1]}
              onChange={(e) => handleSpecialFeatureChange(1, e.currentTarget.value)}
            />
            <Input
              type="text"
              value={props.specialFeatures[2]}
              onChange={(e) => handleSpecialFeatureChange(2, e.currentTarget.value)}
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="whitespace-nowrap">Price:</span>
          <Input
            type="number"
            className="w-full sm:w-[200px]"
            value={props.price}
            onChange={(e) =>
              onFormChange({
                ...props,
                price: e.currentTarget.value,
              })
            }
            placeholder="0.00€"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="whitespace-nowrap">Sale Price:</span>
          <Input
            type="number"
            className="w-full sm:w-[200px]"
            value={props.salePrice}
            onChange={(e) =>
              onFormChange({
                ...props,
                salePrice: e.currentTarget.value,
              })
            }
            placeholder="0.00€"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="whitespace-nowrap">Stock:</span>
          <Input
            type="number"
            className="w-full sm:w-[200px]"
            value={props.stock ?? ""}
            onChange={(e) =>
              onFormChange({
                ...props,
                stock: e.currentTarget.value,
              })
            }
            placeholder="0"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Is In Stock:</span>
          <div className="flex gap-2 items-center mt-2 sm:mt-0">
            <span
              className={cn(
                "select-none border rounded-sm px-3 py-1 ml-1 transition-colors duration-300",
                props.isAvailable
                  ? "text-gray-100 bg-green-500 border-green-500"
                  : "cursor-pointer hover:bg-gray-100 border border-gray-200"
              )}
              onClick={() => onFormChange({ ...props, isAvailable: true })}
            >
              In Stock
            </span>
            <span
              className={cn(
                "select-none border rounded-sm px-3 py-1 ml-1 transition-colors duration-300",
                !props.isAvailable
                  ? "text-gray-100 bg-red-500 hover:bg-red-500 border-red-500"
                  : "cursor-pointer hover:bg-gray-100 border border-gray-200"
              )}
              onClick={() => onFormChange({ ...props, isAvailable: false })}
            >
              Out Of Stock
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Brand:</span>
          <div className="w-full sm:w-[200px]">
            <DropDownList
              data={brandList}
              width="100%"
              selectedIndex={selectedBrandListIndex}
              onChange={handleBrandChange}
            />
          </div>
        </div>
        <div className="flex flex-col w-full">
          <span>Images:</span>
          <div className="mt-2">
            <MultiImageUploader onChange={(imgs) => onFormChange({ ...props, images: imgs })} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>Category</span>
          <div className="w-full sm:w-[430px]">
            <DropDownList
              data={categoryList}
              width="100%"
              selectedIndex={selectedCategoryListIndex}
              onChange={handleCategoryChange}
            />
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-gray-200 w-full h-auto py-4 flex flex-col">
        <span className="text-base mb-4">Specifications:</span>
        <div className="flex-grow flex flex-col items-start gap-4 mb-6">
          {categorySpecs.length ? (
            <>
              {categorySpecs.map((specGroup, groupIndex) => (
                <div className="w-full flex flex-col p-3 rounded-md border border-gray-300" key={specGroup.id}>
                  <span className="w-full pb-3 mb-3 border-b border-gray-200">{specGroup.title}</span>
                  <>
                    {specGroup.specs.map((spec, specIndex) => (
                      <div
                        className="w-full flex items-center justify-between p-2 pl-4 rounded-md transition-colors duration-600 hover:bg-gray-100"
                        key={specIndex}
                      >
                        <span>{spec}</span>
                        <Input
                          type="text"
                          className="w-[200px]"
                          value={props.specifications[groupIndex]?.specValues[specIndex]}
                          onChange={(e) => {
                            props.specifications[groupIndex].specValues[specIndex] = e.currentTarget.value;
                            onFormChange({ ...props });
                          }}
                        />
                      </div>
                    ))}
                  </>
                </div>
              ))}
            </>
          ) : (
            <span>Can not Find! </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
