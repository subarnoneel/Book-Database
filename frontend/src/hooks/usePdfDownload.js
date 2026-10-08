import { useState } from "react";
import { useToast } from "../context/ToastContext";
import { downloadBooksPdf, getErrorMessage } from "../services/api";

const filenameFrom = (header) => /filename="?([^";]+)"?/.exec(header ?? "")?.[1] ?? "home-library.pdf";

// Downloads the whole library as a PDF. Returns { download, downloading }.
export default function usePdfDownload() {
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const download = async () => {
    setDownloading(true);
    try {
      const response = await downloadBooksPdf();
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFrom(response.headers["content-disposition"]);
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("PDF downloaded");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not create the PDF"));
    } finally {
      setDownloading(false);
    }
  };

  return { download, downloading };
}
