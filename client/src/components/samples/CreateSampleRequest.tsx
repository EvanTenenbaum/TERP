import React from "react";
import {
  SampleForm,
  type SampleFormProps,
  type SampleFormValues,
} from "@/components/samples/SampleForm";

export type CreateSampleRequestValues = SampleFormValues;

export const CreateSampleRequest = React.memo(function CreateSampleRequest(
  props: SampleFormProps
) {
  return <SampleForm {...props} />;
});

export default CreateSampleRequest;
