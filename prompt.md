# Feature Update Request

Please implement the following enhancements across both the frontend and backend while maintaining backward compatibility and ensuring the application remains stable.

## 1. Enhance the Price Section

Update the price input system to support **two mutually exclusive pricing modes**:

### Option A: Fixed Price

* Allow the user to enter a single price (e.g., `2000`).

### Option B: Price Range

* Allow the user to enter a minimum and maximum price (e.g., `2000 - 5000`).

### Requirements

* The user must be able to select **only one pricing mode** at a time.
* Selecting **Fixed Price** must disable or hide the **Price Range** fields.
* Selecting **Price Range** must disable or hide the **Fixed Price** field.
* Update both the frontend UI and backend data model/API validation to fully support both pricing modes.
* Ensure all validation logic, database storage, and API responses correctly handle the selected pricing mode.
* Existing functionality should continue to work where applicable.

---

## 2. Improve Price Input Validation

Update the price input fields to provide a better user experience.

### Requirements

* Allow users to enter very large numeric values without imposing an unnecessarily small maximum length.
* Restrict input to valid numeric characters only.
* Prevent invalid characters such as:

  * Letters
  * Special symbols (except where required by the UI)
  * Scientific notation (e.g., `1e5`)
  * Negative values (unless explicitly supported by the business logic)
* Support common editing actions such as copy, paste, delete, and keyboard navigation.
* Perform both client-side and server-side validation to ensure data integrity.

---

## 3. Improve Error Handling

Review and enhance the application's error handling to provide clear, actionable feedback.

### Requirements

* Replace generic error messages with descriptive, user-friendly messages that clearly identify the cause of the problem.
* Distinguish between different error categories, including:

  * Validation errors
  * Network errors
  * Authentication/authorization errors
  * Server errors
  * Database errors
  * Unexpected exceptions
* Display the appropriate error message to the user without exposing sensitive internal information.
* Ensure the frontend surfaces backend validation errors accurately.
* Improve server-side logging to aid debugging while keeping sensitive information out of client responses.

---

## Deliverables

* Update all affected frontend components.
* Update all backend models, validation, controllers, and API endpoints as necessary.
* Maintain backward compatibility where possible.
* Add or update validation logic and tests for the new functionality.
* Verify that all changes are fully functional and that no existing features are broken.
* Provide a summary of all files modified and explain the purpose of each change.
