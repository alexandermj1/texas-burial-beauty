import { defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import submitInquiry from "./tools/submit-inquiry";

export default defineMcp({
  name: "texas-cemetery-brokers-mcp",
  title: "Texas Cemetery Brokers",
  version: "0.1.0",
  instructions:
    "Tools for the Texas Cemetery Brokers marketplace. Use `search_listings` to find active cemetery properties, `get_listing` to fetch details, and `submit_inquiry` to send a buyer/seller inquiry into the brokerage inbox.",
  tools: [searchListings, getListing, submitInquiry],
});
