import type { Category } from "./category.type";

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  countInStock: number;
  category: Category;
}

export interface ProductListResponse {
  items: Product[];
  page: number;
  pages: number;
  total: number;
}