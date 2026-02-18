import { Link } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import type { RegisterForm } from "../types/userType";
import { useMutation } from "@tanstack/react-query";
import { RegisterAPI } from "../API/userServices";
import { InputField } from "../ui/InputUI";
import { ButtonUI } from "../ui/ButtonUI";
import { useNavigate } from "react-router-dom";

const validationSchema = Yup.object({
  firstName: Yup.string().required("First name field is required"),
  lastName: Yup.string().required("last name field is required"),
  email: Yup.string().email().required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  phoneNumber: Yup.string()
    .matches(/^[0-9]{10,15}$/, "Enter a valid phone number")
    .required("Phone number is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords must match")
    .required("Confirming your password is required"),
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
      console.log(values);
      mutateAsync(values)
        .then((data) => {
          console.log(data);
          navigate("/Verify");
          formik.resetForm();
        })
        .catch((err) => console.log(err));
    },
  });
  return (
    <div className="flex justify-center items-center h-screen w-full bg-gray-100">
      <div className="w-full md:w-1/2 h-screen flex items-center gap-3 flex-col px-4 lg:px-[100px]">
        <p className="text-blue-950 text-center text-3xl font-bold">Register</p>
        <p className="text-gray-400 text-center text-sm">
          Fill in the details to Register
        </p>
        <form
          onSubmit={formik.handleSubmit}
          className="w-full flex flex-col gap-2 pt-2"
        >
          <InputField
            isPending={isPending}
            formik={formik}
            name="email"
            label="Email"
            type="email"
            size="small"
          />
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
          <InputField
            isPending={isPending}
            formik={formik}
            name="phoneNumber"
            label="Phone Number"
            type="tel"
            size="small"
          />
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
            label="Confirm Password"
            type="password"
            size="small"
          />
          <ButtonUI isPending={isPending} name="Register" />
        </form>
        {/* the dividing line before and after login with */}
        <div className="w-full flex items-center justify-center my-1">
          <div className="grow border-t border-gray-300"></div>
          <span className="mx-4 text-sm text-gray-500 whitespace-nowrap">
            Or Register With
          </span>
          <div className="grow border-t border-gray-300"></div>
        </div>

        <div className="flex gap-2 ">
          <p className="inline text-base">Already have an account?</p>
          <Link
            to="/Login"
            className="text-blue-700 hover:underline text-base text-center"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
