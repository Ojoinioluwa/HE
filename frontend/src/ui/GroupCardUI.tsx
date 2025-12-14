import PropTypes from "prop-types";
import { Button } from "@mui/material";
import DummyImage from "../assets/login.jpeg";
import { useNavigate } from "react-router-dom";

type Group = {
  name: string;
  type: string;
  description: string;
  _id: string;
};
export const GroupCardUI = ({ group }: { group: Group }) => {
  const {
    name,
    type,
    description,
    _id,
    // Optional future fields like imageUrl can go here
  } = group;

  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col bg-white rounded-xl shadow-md hover:shadow-xl hover:scale-[1.03] transition-transform duration-300 w-[220px] h-[340px] overflow-hidden cursor-pointer border border-gray-200"
      onClick={() => navigate(`/dashboard/groups/${_id}`)}
    >
      <div className="relative h-[180px] w-full">
        <img
          src={DummyImage}
          alt={`${name} image`}
          className="h-full w-full object-cover rounded-t-xl transition-transform duration-300 hover:scale-105"
        />
        {/* Optional gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-t-xl"></div>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2 bg-gray-50">
        <p className="text-blue-950 text-lg font-semibold truncate">{name}</p>
        <p className="text-blue-950 text-sm">
          <span className="font-medium">Type:</span>{" "}
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </p>
        <p className="text-blue-950 text-xs text-justify line-clamp-3">
          {description}
        </p>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={(e) => {
            e.stopPropagation(); // Prevent parent card click
            navigate(`/dashboard/groups/${_id}`);
          }}
          className="mt-auto"
        >
          View Group
        </Button>
      </div>
    </div>
  );
};

GroupCardUI.propTypes = {
  group: PropTypes.shape({
    name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
};
