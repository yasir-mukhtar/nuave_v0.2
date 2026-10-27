import { describe, expect, it } from "vitest";
import { chatgptListings, googleListings, listingRating } from "./listings";
import { containsPhoneNumber } from "./phones";

// Spec 021 C-01, AC-C2: what the sources' own pages listed about each
// business, read from results shaped like DataForSEO's published schemas.

const chatgpt = {
  items: [
    { type: "chat_gpt_text", markdown: "Pilihan: Klinik Seroja." },
    {
      type: "chat_gpt_local_businesses",
      items: [
        {
          type: "chat_gpt_local_businesses_element",
          title: "Klinik Seroja",
          description: "Klinik kecantikan",
          address: "Jl. Kenanga No. 5, Bandung",
          phone: "+62 812 3456 7890",
          reviews_count: 222,
          url: "https://www.klinikseroja.example/",
          domain: "www.klinikseroja.example",
          rating: {
            rating_type: "Max5",
            value: 4.7,
            votes_count: 222,
            rating_max: 5,
          },
        },
        // Fields missing: kept with what there is.
        { type: "chat_gpt_local_businesses_element", title: "Klinik Dahlia" },
        // A WhatsApp link and a phone number in the title.
        {
          type: "chat_gpt_local_businesses_element",
          title: "Klinik Melati 0812-9999-8888",
          url: "https://wa.me/6281299998888",
          rating: { value: 9, rating_max: 5 },
        },
        { type: "chat_gpt_local_businesses_element", title: "" },
      ],
    },
  ],
};

describe("ChatGPT's business cards (C-01)", () => {
  it("keeps name, website, rating and reviews, and never the address or phone", () => {
    const listings = chatgptListings(chatgpt);
    expect(listings).toEqual([
      {
        name: "Klinik Seroja",
        website: "https://www.klinikseroja.example/",
        rating: { value: 4.7, max: 5 },
        reviews: 222,
        card: true,
      },
      {
        name: "Klinik Dahlia",
        website: null,
        rating: null,
        reviews: null,
        card: true,
      },
      {
        name: "Klinik Melati [nomor telepon dihapus]",
        website: null,
        rating: null,
        reviews: null,
        card: true,
      },
    ]);
    const saved = JSON.stringify(listings);
    // AC-C2.
    expect(containsPhoneNumber(saved)).toBe(false);
    expect(saved).not.toContain("Kenanga");
    expect(saved).not.toContain("wa.me");
  });

  it("an answer without cards has no listings", () => {
    expect(chatgptListings({ items: [{ type: "chat_gpt_text" }] })).toEqual([]);
    expect(chatgptListings({})).toEqual([]);
  });
});

describe("Google's own page (C-01)", () => {
  const result = {
    items: [
      {
        type: "local_pack",
        title: "Klinik Seroja",
        phone: "022 123 4567",
        url: "https://klinikseroja.example/",
        domain: "klinikseroja.example",
        rating: {
          rating_type: "Max5",
          value: 4.8,
          votes_count: 137,
          rating_max: 5,
        },
      },
      {
        type: "organic",
        website_name: "Klinik Dahlia",
        url: "https://dahlia.example/perawatan",
        domain: "dahlia.example",
        rating: { value: 4.9, votes_count: 50, rating_max: 5 },
      },
      {
        type: "local_pack",
        title: "Klinik Lain",
        url: "https://lain.example/",
      },
    ],
  };

  it("map results keep a rating; organic results only the website; names the AI Overview did not name are skipped", () => {
    expect(googleListings(result, ["Klinik Seroja", "Klinik Dahlia"])).toEqual([
      {
        name: "Klinik Seroja",
        website: "https://klinikseroja.example/",
        rating: { value: 4.8, max: 5 },
        reviews: 137,
        card: false,
      },
      {
        name: "Klinik Dahlia",
        website: "https://dahlia.example/perawatan",
        rating: null,
        reviews: null,
        card: false,
      },
    ]);
    expect(
      containsPhoneNumber(
        JSON.stringify(googleListings(result, ["Klinik Seroja"])),
      ),
    ).toBe(false);
  });

  it("a rating outside its scale is dropped; another scale is kept as it is", () => {
    expect(listingRating({ value: 6, rating_max: 5 })).toBeNull();
    expect(listingRating({ value: 0 })).toBeNull();
    expect(listingRating({ value: 8.5, rating_max: 10 })).toEqual({
      value: 8.5,
      max: 10,
    });
    expect(listingRating({ value: 4.2 })).toEqual({ value: 4.2, max: 5 });
    expect(listingRating(null)).toBeNull();
  });
});
