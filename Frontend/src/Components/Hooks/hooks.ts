import { useDispatch, useSelector } from "react-redux"
import type { RootState, AppDispatch } from "../Redux/Store/Store"

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T) =>
  useSelector(selector)