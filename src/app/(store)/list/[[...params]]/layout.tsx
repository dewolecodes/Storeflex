import { Metadata } from "next";

export const metadata: Metadata = {
  title: "storeflex - Products List",
};

const ListLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ListLayout;
