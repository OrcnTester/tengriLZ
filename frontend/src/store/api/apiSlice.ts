import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface CandidatesParams {
  lat: number;
  lon: number;
  window_m?: number;
  slope_max_deg?: number;
  min_diameter_m?: number;
  morph?: 'closing' | 'opening';
  aircraft_code?: string;
  rotor_diameter_m?: number;
  safety_margin_m?: number;
  k?: number;
  slope_override_deg?: number;
}

export interface ObstaclesParams {
  lat: number;
  lon: number;
  window_m: number;
  pad_m?: number;
  min_h: number;
  smooth_sigma: number;
  out_crs?: string;
}

export interface ClearanceParams {
  lat0: number;
  lon0: number;
  lat1: number;
  lon1: number;
  window_m: number;
  pad_m?: number;
  min_h: number;
  out_crs?: string;
  altitude: {
    mode: 'AGL' | 'MSL';
    value_m: number;
  };
  corridor_width_m: number;
  min_clearance_m: number;
  step_m: number;
}

export interface CandidatesResponse {
  id: string;
  name: string;
  location: {
    lat: number;
    lon: number;
  };
  // Add other fields as needed
}

export interface ObstaclesResponse {
  id: string;
  height: number;
  location: {
    lat: number;
    lon: number;
  };
  // Add other fields as needed
}

export interface ClearanceResponse {
  id: string;
  status: string;
  details: Record<string, unknown>;
  // Add other fields as needed
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://127.0.0.1:8000',
  }),
  tagTypes: ['Candidates', 'Obstacles', 'Clearance'],
  endpoints: (builder) => ({
    getCandidates: builder.query<CandidatesResponse[], CandidatesParams>({
      query: (params) => ({
        url: '/candidates',
        params,
      }),
      providesTags: ['Candidates'],
    }),
    getObstaclesAOI: builder.query<ObstaclesResponse[], ObstaclesParams>({
      query: (params) => ({
        url: '/m2/obstacles/aoi',
        params,
      }),
      providesTags: ['Obstacles'],
    }),
    postClearanceAOI: builder.mutation<ClearanceResponse, ClearanceParams>({
      query: ({ lat0, lon0, lat1, lon1, window_m, pad_m, min_h, out_crs, ...body }) => ({
        url: '/m2/clearance/aoi',
        method: 'POST',
        params: {
          lat0,
          lon0,
          lat1,
          lon1,
          window_m,
          min_h,
          out_crs: out_crs || 'EPSG:4326',
          ...(pad_m && { pad_m }),
        },
        body,
      }),
      invalidatesTags: ['Clearance'],
    }),
    postCandidates: builder.mutation<CandidatesResponse[], CandidatesParams>({
      query: (body) => ({
        url: '/candidates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Candidates'],
    }),
  }),
});

export const {
  useGetCandidatesQuery,
  useGetObstaclesAOIQuery,
  usePostClearanceAOIMutation,
  usePostCandidatesMutation,
} = apiSlice;
