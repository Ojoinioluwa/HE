import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import EditIcon from "@mui/icons-material/Edit";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  DeleteAuthorizedUserAPI,
  ToggleAuthorizedUserAPI,
} from "../services/Authorize/authorizeService";
import { useQueryClient } from "@tanstack/react-query";

type AuthorizedUser = {
  firstName: string;
  email: string;
  password: { name: string };
  authorized: boolean;
  authorizedId: string;
  expiresAt?: string;
};

function ListAuthorizedUsersUI({
  message,
  authorizedUsers,
}: {
  message: string;
  authorizedUsers: AuthorizedUser[];
}) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { mutateAsync: toggleUser } = useMutation({
    mutationKey: ["ToggleAuthorizedUser"],
    mutationFn: ToggleAuthorizedUserAPI,
  });

  const { mutateAsync: deleteUser } = useMutation({
    mutationKey: ["DeleteAuthorizedUser"],
    mutationFn: DeleteAuthorizedUserAPI,
  });

  const handleToggle = async (authorizedId: string) => {
    try {
      await toggleUser({ authorizedId });
      queryClient.invalidateQueries({ queryKey: ["AuthorizedUsers"] });
    } catch (err) {
      console.error("Toggle failed:", err);
    }
  };

  const handleDelete = async (authorizedId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser({ authorizedId });
        queryClient.invalidateQueries({ queryKey: ["AuthorizedUsers"] });
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleEdit = (id: string) => {
    console.log("Edit user:", id);
    // Replace this with openModal(user) or navigate(`/edit/${user.authorizedId}`)
  };

  const filteredUsers = useMemo(() => {
    if (!authorizedUsers) return [];
    return authorizedUsers.filter((user) =>
      user.firstName.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, authorizedUsers]);

  return (
    <div className="min-h-screen h-[100vh] bg-transparent m-3 rounded-xl p-4 flex flex-col gap-6">
      {/* Filters */}
      <div className="bg-stone-50 rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4 items-center shadow-sm">
        <h4 className="text-xl font-semibold text-blue-800">{message}</h4>
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            className="border border-gray-300 rounded-full px-3 py-1.5 text-sm w-52"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-y-scroll hide-scrollbar bg-white h-[70vh] rounded-xl shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Password Name</th>
              <th className="px-4 py-2 text-left">Authorized</th>
              <th className="px-4 py-2 text-left">Expires At</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 overflow-y-scroll">
            {filteredUsers.map((user: AuthorizedUser, index: number) => (
              <tr
                key={index}
                className={`hover:bg-purple-50 ${
                  index % 2 === 0 ? "bg-white" : "bg-gray-50"
                }`}
              >
                <td className="px-4 py-3">{user.firstName}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3 text-gray-500 font-mono">
                  {user.password.name}
                </td>
                <td className="px-4 py-3">
                  {user.authorized ? (
                    <CheckCircleOutlineIcon
                      className="text-green-600 cursor-pointer"
                      fontSize="small"
                      titleAccess="Click to unauthorize"
                      onClick={() => handleToggle(user.authorizedId)}
                    />
                  ) : (
                    <CancelOutlinedIcon
                      className="text-red-500 cursor-pointer"
                      fontSize="small"
                      titleAccess="Click to authorize"
                      onClick={() => handleToggle(user.authorizedId)}
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.expiresAt
                    ? user.expiresAt.toString().split("T")[0]
                    : "NIL"}
                </td>
                <td className="px-4 py-3 flex gap-5">
                  <DeleteOutlineIcon
                    className="text-gray-600 hover:text-red-600 cursor-pointer"
                    fontSize="small"
                    titleAccess="Delete user"
                    onClick={() => handleDelete(user.authorizedId)}
                  />

                  {user.authorized ? (
                    <ToggleOnIcon
                      className="text-green-600 cursor-pointer"
                      fontSize="medium"
                      onClick={() => handleToggle(user.authorizedId)}
                      titleAccess="Click to unauthorize"
                    />
                  ) : (
                    <ToggleOffIcon
                      className="text-gray-400 cursor-pointer"
                      fontSize="medium"
                      onClick={() => handleToggle(user.authorizedId)}
                      titleAccess="Click to authorize"
                    />
                  )}

                  <EditIcon
                    className="text-blue-500 cursor-pointer hover:text-blue-700"
                    fontSize="medium"
                    onClick={() => handleEdit(user.authorizedId)}
                    titleAccess="Edit User"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ListAuthorizedUsersUI;
