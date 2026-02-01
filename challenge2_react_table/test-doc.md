## Part 1: Basic Rendering & Data Integrity
* **Total Records**: The pagination component or status bar must display a total record count of **100**.
* **Initial Display**: By default, the first row of the table should display **Alex Chen** (ID: `E001`).
* **Pagination Generation**: With 10 records per page, pagination buttons should be generated from **1 to 10**.

## Part 2: Sorting Functionality (Real Data Constraints)
* **Salary Ascending**: Clicking the header once should display **Noah Johnson** (Salary: `70000`) in the first row.
* **Salary Descending**: Clicking again should display **Priya Patel** (Salary: `135000`) in the first row.
* **Name Alphabetical (A-Z)**: Sorting should be case-insensitive. The first row should be **Adrian Brooks**, and the last row should be **Zoë Kravitz**.
* **Date Chronology (startDate)**: Sorting by date should show the earliest start date as **2019-01-01**.

## Part 3: Text Filtering & Search
* **Exact Name Search**: Searching for `Chris Martin` should return exactly **1** record.
* **Department Keyword**: Searching for `Engineering` should result in a total filtered count of **18**.
* **City Search**: Searching for `Seattle` should filter results to show only employees from that city.
* **Fuzzy Matching**: Entering `Skylar` should successfully match **Skylar Stone**.
* **Search Reset**: Clearing the input box should immediately restore the table to show the original first 10 records.

## Part 4: Pagination Operations
* **Page Navigation**: Clicking page `6` should display employee IDs ranging from **E051 to E060**.
* **Last Page Boundary**: Clicking page `10` should show the final 10 records, and the "Next" button must become disabled.
* **Page Size Toggle**: Changing the Page Size from 10 to 25 should immediately reduce the total number of pages to **4**.

## Part 5: Complex Interaction Logic
* **Search after Sort**: If sorted by `Salary` (descending) first, then filtered for `Sales` (12 records total), the first row must show the highest-paid employee in the Sales department.
* **Pagination after Filter**: Search for employees containing the letter `e`. When navigating through the resulting pages, verify that all entries across all pages still contain the letter `e`.
* **State Reset**: If on page `3` and the user changes the sort order, the pagination should automatically reset to **Page 1** to prevent data misalignment.

## Part 6: Robustness & Type Checking
* **Special Character Rendering**: Verify that special characters in names (e.g., the `ë` in **Zoë Kravitz**) render correctly without encoding errors.
* **TypeScript Definitions**: Ensure the code defines a strict `interface Employee` including fields: `id: string`, `name: string`, `salary: number`, `startDate: string`, etc.