import React, { useState } from "react";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import { LoginAPI, UpdateHEKeysAPI } from "../API/userServices";
import { setAuth, setSecretKey } from "../redux/slice/authSlice";
import type { LoginResponse } from "../types/userType";
import {
  createAndWrapKeys,
  unwrapAndLoadKeys,
  initializeSEALClient,
} from "../utils/heClient";

// --- Validation Schema ---
const validationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email")
    .required("Email Field is required"),
  password: Yup.string()
    .required("Password Field is required")
    .min(8, "Password should not be less than 8 characters"),
});

const LoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isHeProcessing, setIsHeProcessing] = useState(false);

  // --- TanStack Query Mutations ---
  const { mutateAsync: loginMutate, isPending: loginPending } = useMutation({
    mutationKey: ["Login"],
    mutationFn: LoginAPI,
  });

  const { mutateAsync: heKeysMutate } = useMutation({
    mutationKey: ["HEKeys"],
    mutationFn: UpdateHEKeysAPI,
  });

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // 1. Perform API Login
        const data: LoginResponse = await loginMutate(values);

        // Initial Auth State Update
        dispatch(setAuth({ token: data.token }));
        localStorage.setItem(
          "userInfo",
          JSON.stringify({
            token: data.token,
            email: data.user.email,
            firstName: data.user.firstName,
          }),
        );

        // 2. Start HE Engine
        setIsHeProcessing(true);
        await initializeSEALClient();

        let finalSecretKeyBase64 = "";

        // 3. Logic: Check for the wrapped key in the backend response
        if (data.user.heConfig?.wrappedSecretKey) {
          // Returning User: Decrypt the existing key
          finalSecretKeyBase64 = await unwrapAndLoadKeys(
            data.user.heConfig.wrappedSecretKey,
            values.password,
            values.email,
          );
        } else {
          // First Time User: Generate new keys
          const { keysAndParams, wrappedSecretKey } = await createAndWrapKeys(
            values.password,
            values.email,
          );

          // MAPPING: Ensure field names match your MongoDB schema exactly
          const payloadForBackend = {
            publicKey: keysAndParams.publicKeyBase64, // Map to publicKey
            evaluationKey: keysAndParams.evaluationKeysBase64, // Map to evaluationKey
            wrappedSecretKey: wrappedSecretKey,
            params: keysAndParams.params,
            isInitialized: true,
            scheme: keysAndParams.scheme,
          };

          // Send to backend
          await heKeysMutate(payloadForBackend);

          // Unwrap the newly created key for immediate use
          finalSecretKeyBase64 = await unwrapAndLoadKeys(
            wrappedSecretKey,
            values.password,
            values.email,
          );
        }

        // 4. Finalize session
        dispatch(setSecretKey(finalSecretKeyBase64));
        localStorage.setItem("heSecretKey", finalSecretKeyBase64);

        toast.success("Secure Session Established!");
        formik.resetForm();
        navigate("/dashboard");
      } catch (err: any) {
        console.error("Login/HE Error:", err);
        toast.error(
          err.response?.data?.message ||
            "Secure Login failed. Verify credentials.",
        );
      } finally {
        setIsHeProcessing(false);
      }
    },
  });

  return (
    <Container maxWidth="xs">
      <Toaster position="top-center" />
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{ padding: 4, width: "100%", borderRadius: 2 }}
        >
          <Typography
            component="h1"
            variant="h5"
            sx={{ mb: 3, fontWeight: "bold", textAlign: "center" }}
          >
            Sign In
          </Typography>

          <Box
            component="form"
            onSubmit={formik.handleSubmit}
            noValidate
            sx={{ mt: 1 }}
          >
            <TextField
              margin="normal"
              fullWidth
              id="email"
              label="Email Address"
              {...formik.getFieldProps("email")}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              autoComplete="email"
              autoFocus
            />

            <TextField
              margin="normal"
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              {...formik.getFieldProps("password")}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loginPending || isHeProcessing}
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: "bold" }}
            >
              {loginPending
                ? "Checking Account..."
                : isHeProcessing
                  ? "Decrypting Secure Session..."
                  : "Sign In"}
            </Button>

            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Typography variant="body2">
                Don't have an account?{" "}
                <Button
                  onClick={() => navigate("/register")}
                  sx={{ textTransform: "none", fontWeight: "bold" }}
                >
                  Sign Up
                </Button>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }}>OR</Divider>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FcGoogle />}
                sx={{
                  textTransform: "none",
                  color: "#555",
                  borderColor: "#ccc",
                }}
              >
                Google
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FaGithub style={{ color: "#333" }} />}
                sx={{
                  textTransform: "none",
                  color: "#555",
                  borderColor: "#ccc",
                }}
              >
                GitHub
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;
