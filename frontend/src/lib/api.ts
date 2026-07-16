import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies if using cookie auth
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const persistAuth = localStorage.getItem("persist:auth");
      if (persistAuth) {
        try {
          const authData = JSON.parse(persistAuth);
          const accessToken = JSON.parse(authData.accessToken);
          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
          }
        } catch (e) {
          // Silent catch if JSON parsing fails
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (typeof window !== "undefined") {
          const persistAuth = localStorage.getItem("persist:auth");
          if (persistAuth) {
            const authData = JSON.parse(persistAuth);
            const refreshToken = JSON.parse(authData.refreshToken);
            
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/auth/refresh-token`, {
                refreshToken,
              });
              
              if (response.data?.success) {
                const { accessToken, refreshToken: newRefreshToken } = response.data.data;
                
                // Update local storage values manually to sync with redux-persist
                const updatedAuth = {
                  ...authData,
                  accessToken: JSON.stringify(accessToken),
                  refreshToken: JSON.stringify(newRefreshToken),
                };
                localStorage.setItem("persist:auth", JSON.stringify(updatedAuth));
                
                // Retry the original request with new token
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
              }
            }
          }
        }
      } catch (refreshError) {
        // If refresh fails, clear auth persist and redirect to landing
        if (typeof window !== "undefined") {
          localStorage.removeItem("persist:auth");
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);
