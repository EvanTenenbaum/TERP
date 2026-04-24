import type { ComponentProps } from "react";
import { AgGridReact } from "ag-grid-react";

type AgGridReactCompatProps<Row extends object> = ComponentProps<
  typeof AgGridReact<Row>
> & {
  "data-loc"?: string;
};

/**
 * The dev-only JSX location plugin injects `data-loc` onto JSX elements.
 * AG Grid treats unknown props as grid options, so strip that debug prop
 * before forwarding to the real grid component.
 */
export function AgGridReactCompat<Row extends object>({
  "data-loc": _dataLoc,
  ...props
}: AgGridReactCompatProps<Row>) {
  return <AgGridReact<Row> {...props} />;
}

export default AgGridReactCompat;
