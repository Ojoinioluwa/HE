import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { RegisterAPI } from "../API/userServices";
import { InputField } from "../ui/InputUI";
import { ButtonUI } from "../ui/ButtonUI";
import type { RegisterForm } from "../types/userType";

const validationSchema = Yup.object({
  firstName: Yup.string().required("First name is required"),
  lastName: Yup.string().required("Last name is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  phoneNumber: Yup.string()
    .matches(/^[0-9]{10,15}$/, "Enter a valid phone number")
    .required("Phone number is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

function Register() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useMutation({
    mutationKey: ["Register"],
    mutationFn: RegisterAPI,
  });

  const formik = useFormik<RegisterForm>({
    initialValues: {
      email: "",
      password: "",
      confirmPassword: "",
      phoneNumber: "",
      firstName: "",
      lastName: "",
    },
    validationSchema,
    onSubmit: (values) => {
      // FIX: Inject the required heConfig for the backend/TypeScript
      const submissionData = {
        ...values,
        heConfig: {
          scheme: "ckks",
          polyModulusDegree: 8192,
          securityLevel: 128,
        },
      };

      mutateAsync(submissionData as any)
        .then(() => {
          navigate("/verify");
          formik.resetForm();
        })
        .catch((err) => console.error(err));
    },
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      {/* Main Card Container */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden flex flex-col md:flex-row border border-slate-100">
        {/* Left Side: Branding/Welcome (Hidden on small screens) */}
        <div className="hidden md:flex md:w-1/3 bg-blue-950 p-8 flex-col justify-between text-white">
          <div>
            <h2 className="text-2xl font-bold">HE Vault</h2>
            <p className="text-blue-200 text-sm mt-2">
              Secure Homomorphic Encryption for your sensitive data.
            </p>
          </div>
          <div className="text-xs text-blue-300">© 2026 HE Vault Inc.</div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 p-8 lg:p-12">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">
              Create Account
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Start securing your data today.
            </p>
          </header>

          <form onSubmit={formik.handleSubmit} className="space-y-4">
            {/* Row for Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                isPending={isPending}
                formik={formik}
                name="firstName"
                label="First Name"
                type="text"
                size="small"
              />
              <InputField
                isPending={isPending}
                formik={formik}
                name="lastName"
                label="Last Name"
                type="text"
                size="small"
              />
            </div>

            <InputField
              isPending={isPending}
              formik={formik}
              name="email"
              label="Email Address"
              type="email"
              size="small"
            />

            <InputField
              isPending={isPending}
              formik={formik}
              name="phoneNumber"
              label="Phone Number"
              type="tel"
              size="small"
            />

            {/* Row for Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                isPending={isPending}
                formik={formik}
                name="password"
                label="Password"
                type="password"
                size="small"
              />
              <InputField
                isPending={isPending}
                formik={formik}
                name="confirmPassword"
                label="Confirm"
                type="password"
                size="small"
              />
            </div>

            <div className="pt-2">
              <ButtonUI isPending={isPending} name="Create Account" />
            </div>
          </form>

          {/* Footer Logic */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/Login"
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
