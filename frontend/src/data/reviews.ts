export interface Review {
  id: string;
  name: string;
  location: string;
  rating: number;
  comment: string;
  verified: boolean;
  productName?: string;
  date: string;
}

export const REVIEWS: Review[] = [
  {
    id: "1",
    name: "Ananya Sharma",
    location: "Mumbai",
    rating: 5,
    comment: "The Complete Hair Care Combo transformed my dry scalp and reduced hair fall within 3 weeks! 100% genuine herbal products.",
    verified: true,
    productName: "Complete Hair Care Combo",
    date: "August 2024"
  },
  {
    id: "2",
    name: "Priya Patel",
    location: "Ahmedabad",
    rating: 5,
    comment: "Anti Pigmentation Combo lightened my dark spots noticeably. Love that it's chemical-free and smells so gentle and natural.",
    verified: true,
    productName: "Anti Pigmentation Combo",
    date: "July 2024"
  },
  {
    id: "3",
    name: "Rohan Verma",
    location: "Delhi",
    rating: 5,
    comment: "Neem Wooden Comb is top quality. Very smooth teeth, no static, and scalp feels refreshed after combing every morning.",
    verified: true,
    productName: "Neem Wooden Comb",
    date: "August 2024"
  },
  {
    id: "4",
    name: "Sneha Reddi",
    location: "Hyderabad",
    rating: 5,
    comment: "Skin & Hair Care Kit is total value for money. Best herbal purchase I've made this year!",
    verified: true,
    productName: "Skin Care and Hair Care Kit",
    date: "June 2024"
  }
];
