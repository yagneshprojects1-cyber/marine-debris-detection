import { fireEvent, render, screen } from "@testing-library/react";
import BatchUploadToolbar from "../components/upload/BatchUploadToolbar";

describe("UploadPage guard rails", () => {
  test("blocks choosing new batch images until current detections are saved", () => {
    const onImagesChange = jest.fn();
    const onBlocked = jest.fn();

    render(
      <BatchUploadToolbar
        imageFiles={[]}
        xmlFiles={[]}
        onImagesChange={onImagesChange}
        onXmlsChange={jest.fn()}
        onSubmit={jest.fn()}
        disabled={false}
        running={false}
        hasUnsavedResults={true}
        onBlocked={onBlocked}
      />,
    );

    const input = screen.getByLabelText(/choose images/i);
    const file = new File(["dummy"], "test.bmp", { type: "image/bmp" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onBlocked).toHaveBeenCalledTimes(1);
    expect(onImagesChange).not.toHaveBeenCalled();
  });
});
