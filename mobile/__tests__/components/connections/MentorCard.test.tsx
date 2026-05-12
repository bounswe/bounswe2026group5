import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "View" }));

import { MentorCard } from "@/components/connections/MentorCard";

const baseProps = {
  id: "mentor-1",
  name: "Jane Doe",
  subtitle: "Senior Software Engineer",
};

describe("MentorCard — rendering", () => {
  it("renders profile, message and more buttons", () => {
    const { getByTestId } = render(<MentorCard {...baseProps} />);
    expect(getByTestId("mentor-profile-button")).toBeTruthy();
    expect(getByTestId("mentor-message-button")).toBeTruthy();
    expect(getByTestId("mentor-more-button")).toBeTruthy();
  });

  it("renders avatar image when avatarUrl is provided", () => {
    const { getByTestId, queryByTestId } = render(
      <MentorCard {...baseProps} avatarUrl="https://cdn.example.com/jane.jpg" />,
    );

    expect(getByTestId("mentor-avatar-image")).toBeTruthy();
    expect(queryByTestId("mentor-avatar-fallback")).toBeNull();
  });

  it("falls back to initials when avatarUrl is missing", () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <MentorCard {...baseProps} />,
    );

    expect(getByTestId("mentor-avatar-fallback")).toBeTruthy();
    expect(queryByTestId("mentor-avatar-image")).toBeNull();
    expect(getByText("JD")).toBeTruthy();
  });
});

describe("MentorCard — interactions", () => {
  it("calls onPress when profile button is pressed", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<MentorCard {...baseProps} onPress={onPress} />);
    fireEvent.press(getByTestId("mentor-profile-button"));
    expect(onPress).toHaveBeenCalled();
  });

  it("calls onMessage when message button is pressed", () => {
    const onMessage = jest.fn();
    const { getByTestId } = render(<MentorCard {...baseProps} onMessage={onMessage} />);
    fireEvent.press(getByTestId("mentor-message-button"));
    expect(onMessage).toHaveBeenCalled();
  });

  it("calls onMore when more button is pressed", () => {
    const onMore = jest.fn();
    const { getByTestId } = render(<MentorCard {...baseProps} onMore={onMore} />);
    fireEvent.press(getByTestId("mentor-more-button"));
    expect(onMore).toHaveBeenCalled();
  });
});
