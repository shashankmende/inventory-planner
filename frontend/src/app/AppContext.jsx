// AppContext.jsx — global state for the inventory planner
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { api } from '../services/api';

const AppContext = createContext(null);

const initialState = {
  // session
  hasData: false,
  hasResults: false,
  // data
  validation: null,
  results: null,
  config: {
    capacityMode: 'manufacturing',
    allocationStrategy: 'strict_priority',
    productPriority: [],
  },
  // ui
  isLoading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_UPLOAD_RESULT':
      return {
        ...state,
        isLoading: false,
        error: null,
        hasData: true,
        hasResults: !!action.payload.results,
        validation: action.payload.validation,
        results: action.payload.results,
        config: action.payload.config,
      };
    case 'SET_RESULTS':
      return {
        ...state,
        isLoading: false,
        error: null,
        hasResults: true,
        results: action.payload.results,
        config: action.payload.config,
      };
    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };
    case 'CLEAR':
      return { ...initialState };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const uploadFile = useCallback(async (file, config) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await api.uploadFile(file, config);
      dispatch({ type: 'SET_UPLOAD_RESULT', payload: result });
      return result;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  }, []);

  const recalculate = useCallback(async (config) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await api.recalculate(config);

      const { config: responseConfig = {}, results = {} } = response;
      const { productPriority = [] } = responseConfig;
      const { products = [] } = results;
      // dispatch({ type: 'SET_CONFIG', payload: responseConfig });
      const backendProductMap = new Map(
        products.map(product => [product.productCode, product])
      );

      const sortedProducts = productPriority
        .map(({ productCode }) => backendProductMap.get(productCode))
        .filter(Boolean);

      const finalResult = {
        config: { ...responseConfig },
        results: {
          ...results,
          products: sortedProducts.length ? sortedProducts : products,
        },
      };

        dispatch({ type: 'SET_RESULTS', payload: finalResult });
      return finalResult;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  }, []);

  const updateConfig = useCallback((partial) => {
    dispatch({ type: 'SET_CONFIG', payload: partial });
  }, []);

  const clearSession = useCallback(async () => {
    await api.clearSession().catch(() => {});
    dispatch({ type: 'CLEAR' });
  }, []);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <AppContext.Provider
      value={{ ...state, uploadFile, recalculate, updateConfig, clearSession, clearError }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
