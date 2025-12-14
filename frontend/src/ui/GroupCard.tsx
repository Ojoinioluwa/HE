import Avatar from "@mui/material/Avatar";

type Group = {
  name: string;
  type: string;
  ownerName: string;
  description: string;
  userCount: number;
  passwordCount: number;
  createdAt: Date;
  expiresAt: Date;
  avatarUrl: string;
};

export default function GroupCard({ group }: { group: Group }) {
  const {
    name,
    type,
    ownerName,
    description,
    userCount,
    passwordCount,
    createdAt,
    expiresAt,
    avatarUrl,
  } = group;

  // Format dates (adjust locale/options as needed)
  const createdDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const expirationDate = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="w-full flex-col md:flex rounded-2xl  transition-all duration-300 overflow-hidden">
      {/* Header: Avatar + Basic Info */}
      <div className="flex items-start p-6 border-b">
        <Avatar
          src={avatarUrl}
          sx={{ width: 64, height: 64 }}
          className="flex-shrink-0 border-2 border-white shadow-sm"
        >
          {name.charAt(0)}
        </Avatar>
        <div className="ml-5 flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{name}</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <p>
              <span className="font-semibold text-gray-600">Type:</span>{" "}
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </p>
            <p>
              <span className="font-semibold text-gray-600">Owner:</span>{" "}
              {ownerName}
            </p>
          </div>
          {description && (
            <p className="mt-3 text-base text-gray-600 line-clamp-3">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Stats & Details */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6">
          {/* Stats: Users & Passwords */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              {/* Heroicon: users */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197"
                />
              </svg>
            </div>
            <div>
              <span className="text-sm text-gray-500 uppercase tracking-wider">
                Users
              </span>
              <span className="block text-2xl font-bold text-gray-800">
                {userCount}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-green-100 text-green-600 p-3 rounded-lg">
              {/* Heroicon: lock-closed */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <span className="text-sm text-gray-500 uppercase tracking-wider">
                Passwords
              </span>
              <span className="block text-2xl font-bold text-gray-800">
                {passwordCount}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="col-span-2 pt-4 border-t mt-2">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">
                  Created On
                </span>
                <span className="text-sm font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">
                  {createdDate}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">
                  Expires On
                </span>
                <span className="text-sm font-semibold text-red-800 bg-red-100 px-2.5 py-1 rounded-md">
                  {expirationDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
