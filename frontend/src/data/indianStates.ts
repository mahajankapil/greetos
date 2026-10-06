/**
 * Every Indian state and union territory, in the order the government lists
 * them (28 states, then 8 union territories).
 *
 * We deliver only within India, so the country is fixed rather than being a
 * dropdown of 200 places we cannot ship to. The state list is exhaustive on
 * purpose — a customer in Ladakh or Lakshadweep should not find themselves
 * unable to complete an order because the list stopped at the big states.
 */

export const INDIAN_STATES: readonly string[] = [
  // States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // Union territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

/** The only country we ship to. Shown as a fixed value, not a choice. */
export const SHIP_TO_COUNTRY = 'India';
