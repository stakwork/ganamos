import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

export const useToast = () => {
  const toast = ({ title, description, variant = "default" }: ToastProps) => {
    // Map our variants to sonner's variants
    const sonnerVariant = variant === "destructive" ? "error" : variant === "success" ? "success" : "default"

    return sonnerToast[sonnerVariant](title, {
      description,
      className:
        variant === "destructive"
          ? "bg-destructive text-destructive-foreground border-destructive dark:bg-red-900 dark:border-red-800"
          : variant === "success"
            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:border-green-800 dark:text-green-100"
            : "bg-white text-foreground border dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700",
      style: {
        backgroundColor: variant === "destructive" ? "var(--destructive)" : variant === "success" ? "#dcfce7" : "white",
        color:
          variant === "destructive"
            ? "var(--destructive-foreground)"
            : variant === "success"
              ? "#166534"
              : "var(--foreground)",
      },
      descriptionClassName: "text-sm opacity-90",
    })
  }

  return { toast }
}
