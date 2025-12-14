import { Button, CircularProgress } from "@mui/material"

export const ButtonUI = ({isPending, name}: {isPending: boolean, name: string})=> {
    return (
        <Button variant="contained" fullWidth type="submit" disabled={isPending}>
            {isPending ? (
              <CircularProgress sx={{ color: "white" }} />
            ) : (
              <p className="text-white font-bold">{name}</p>
            )}
          </Button>
    )
}