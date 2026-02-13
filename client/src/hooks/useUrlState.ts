
import { useLocation } from "wouter";

export function useUrlState() {
  const [location] = useLocation();
  
  // Parse URL search params
  const getSearchParams = () => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  };

  // Get a specific param value
  const getParam = (key: string): string | null => {
    return getSearchParams().get(key);
  };

  // Get an array param (comma-separated values)
  const getArrayParam = (key: string): string[] => {
    const value = getParam(key);
    return value ? value.split(",").filter(Boolean) : [];
  };

  // Set a param value
  const setParam = (key: string, value: string | null) => {
    const params = getSearchParams();
    
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    
    updateUrl(params);
  };

  // Set an array param (comma-separated values)
  const setArrayParam = (key: string, values: string[]) => {
    const params = getSearchParams();
    
    if (values.length === 0) {
      params.delete(key);
    } else {
      params.set(key, values.join(","));
    }
    
    updateUrl(params);
  };

  // Remove a param
  const removeParam = (key: string) => {
    const params = getSearchParams();
    params.delete(key);
    updateUrl(params);
  };

  // Clear all params
  const clearAllParams = () => {
    updateUrl(new URLSearchParams());
  };

  // Update URL with new params
  const updateUrl = (params: URLSearchParams) => {
    const search = params.toString();
    const newUrl = search ? `${location}?${search}` : location.split("?")[0];
    
    // Use replaceState to avoid adding to browser history
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", newUrl);
    }
  };

  return {
    getParam,
    getArrayParam,
    setParam,
    setArrayParam,
    removeParam,
    clearAllParams,
  };
}

