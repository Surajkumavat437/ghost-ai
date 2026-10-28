import { cn as mergeClasses, type ClassNameValue } from "cn";

export function cn(...inputs: ClassNameValue[]): string {
  return mergeClasses(...inputs);
}
