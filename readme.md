This README is designed to guide a developer through setting up both the **Node.js** backend and the **React.js** frontend. It assumes a standard project structure where both directories exist within a main folder (monorepo style) or are handled separately.

---

# 🚀 Project Setup Guide

Welcome to the **HE Vault** repository. This project consists of a Node.js Express backend and a React frontend. Follow the steps below to get your local environment running.

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** (v18.x or higher recommended)
- **npm** or **yarn**
- **Git**

---

## 🛠️ 1. Backend Setup (Node.js)

The backend handles authentication, data encryption, and database interactions.

1.  **Navigate to the server directory:**
    ```bash
    cd backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Configure Environment Variables:**
    Place the .env file provided to you directly into the root of the backend folder. This file contains the necessary environment     configurations (such as database URIs, API keys, and JWT secrets) required for the server to authenticate and run correctly.


5.  **Start the server:** - **Development mode (with nodemon):**
    `
npm run server
`- **Production mode:**
    `
npm run start
` The backend should now be running at`http://localhost:8888`.

---

## 💻 2. Frontend Setup (React.js)

The frontend provides the user interface for registration, login, and data management.

1.  **Navigate to the client directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  ### ⚠️ CRITICAL: Configure the API Base URL for Localhost

By default, the repository is configured to point to the production server. To run the application locally, you must update the API configuration file:

1. Open the file located at: **`frontend\src\utils\url.ts`**
2. Replace its contents with the following code (which comments out the production/environment variables and uncomments the localhost URL):

```typescript
// export const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ! used for local host
export const BASE_URL = 'http://localhost:8888/api/v1';

// used for the production server
// export const BASE_URL = 'https://he-400l.onrender.com/api/v1';

```
4.  **Start the development server:**
    ```bash
    npm run dev
    ```
    > The frontend should now be accessible at `http://localhost:5173`.

---

## 🏗️ Project Architecture

| Component    | Technology                         | Description                                   |
| :----------- | :--------------------------------- | :-------------------------------------------- |
| **Frontend** | React, TanStack Query, Formik, Yup | State management and form validation.         |
| **Backend**  | Node.js, Express                   | RESTful API and Homomorphic Encryption logic. |
| **Styling**  | Tailwind CSS                       | Utility-first CSS for the UI.                 |

---

## 🧪 Common Troubleshooting

- **CORS Errors:** Ensure the backend has CORS enabled and allows the frontend's origin (e.g., `http://localhost:5173`).
- **Dependency Issues:** If you encounter errors during installation, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.
- **Port Conflicts:** If port 5173 is in use, you can change them in the respective `.env` or configuration files.

---

## 📜 Available Scripts

### Backend

- `npm run server`: Starts the server with live reload.
- `npm run start`: Runs the server in production mode.

### Frontend

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production.
- `npm run preview`: Locally previews the production build.

```

```
