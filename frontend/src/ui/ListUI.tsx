import { Avatar, IconButton } from "@mui/material";
import SouthIcon from "@mui/icons-material/South";
import NorthIcon from "@mui/icons-material/North";
import type { Password } from "../types/passwordType";

type ListUiProps = {
  selected: string | null | undefined;
  data: Password[];
  setSelected: React.Dispatch<React.SetStateAction<string | null>>;
};

export const ListUI = ({ setSelected, selected, data }: ListUiProps) => {
  const apiKey = "pk_DvZCIz0oTZ6ajtOf0L9nnA"; // your key here

  // Helper to extract domain from URL (removes protocol and any path/query)
  const extractDomain = (url?: string) => {
    if (!url) return "";
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      // Fallback if URL constructor fails (invalid URL)
      return url.replace(/(^\w+:|^)\/\//, "").split("/")[0];
    }
  };

  return (
    <div className="flex flex-col items-start w-full space-y-2">
      {data?.map((password: Password) => {
        const domain = extractDomain(password.url);
        const imgUrl = domain
          ? `https://img.logo.dev/${domain}?token=${apiKey}&size=250&format=png`
          : "";

        const isSelected = selected === password._id;

        return (
          <div key={password._id} className="flex flex-col w-full">
            <div
              onClick={() => setSelected(isSelected ? null : password._id!)}
              className={`flex justify-between items-center w-full rounded-lg border transition-all duration-200 px-4 py-3 cursor-pointer ${
                isSelected
                  ? "bg-gray-100 border-gray-400 shadow-inner"
                  : "bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm"
              }`}
            >
              <div className="flex items-center gap-4">
                <Avatar
                  src={imgUrl}
                  alt={`${password.title} logo`}
                  className="w-10 h-10"
                />
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-gray-800">
                    {password.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {password.url || "-"}
                  </p>
                </div>
              </div>
              <IconButton
                aria-label="toggle expand"
                size="small"
                className="text-gray-600 hover:text-gray-800"
              >
                {isSelected ? (
                  <NorthIcon fontSize="small" />
                ) : (
                  <SouthIcon fontSize="small" />
                )}
              </IconButton>
            </div>
          </div>
        );
      })}
    </div>
  );
};
