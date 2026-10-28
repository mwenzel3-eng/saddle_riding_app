# Rider avatar attire research

Research date: October 28, 2026. These are stylized, unmounted portrait designs for the existing SVG avatar system, not photographs or generated raster images. The original five portraits remain intact. Fifteen new assets live in `public/avatars/`; outfit definitions are in `config/avatar-wardrobe.json`. Skin tones and hair styles vary across collections. Clothing, not a rider's ethnicity, defines each category.

## Design decisions and primary references

- **Hunt-seat and Arabian hunter pleasure:** restrained coats and clean collars distinguish these from saddle-seat suits. The Arabian Horse Association's [Hunter Pleasure judges guide, attire section](https://www.arabianhorses.org/export/content.export/judges-stewards/js-docs/JS_NB_Hunter_Pleasure.pdf) discusses conservative hunting-style coats and headwear. The [USHJA introduction](https://www.ushja.org/about-us-and-news/hunterjumper-101) establishes the hunter/jumper discipline distinction. Coat colors and individual portrait styling are our design choices.
- **Dressage:** a dark coat, white stock-tie treatment and protective helmet are used as recognizable dressage design cues. USEF's [Rules & Equipment resource](https://www.usef.org/compete/disciplines/dressage/rules--equipment) lists the current 2026 attire booklet and updates. The resource was indexed but full retrieval was access-restricted, so these portraits are not presented as a line-by-line interpretation of DR120.
- **Cross-country:** a colored top and visibly segmented protective vest distinguish this portrait. The [USEA Young Event Horse dress guidance](https://useventing.com/events-competitions/young-event-horse/yeh-rules-and-guidelines) identifies protective headgear and a safety vest for that jumping phase. The teal colors are artistic choices, not an official team uniform.
- **Saddle seat and Arabian pleasure:** jacket, waistcoat and necktie create the saddle-seat silhouette, with a traditional derby. The Arabian Horse Association's [Country English Pleasure guide, attire section](https://www.arabianhorses.org/export/content.export/judges-stewards/js-docs/JS_NB_Country_English_Pleasure.pdf) specifies saddle-seat styling and describes coordinated coats, headwear and contrasting vests/ties. Its [English Pleasure discipline sheet](https://arabianhorses.org/export/content.export/youth-docs/English-Pleasure_Disciplines.pdf) identifies informal saddle-seat attire. Grey-green versus plum distinguishes our two designs; those colors do not define the competitive classes.
- **Western:** collared shirts and Western hats create the main visual family; ranch and reining designs use practical textures, while pleasure has a more decorated shirt. AHA's [Western Pleasure judges guide, attire section](https://www.arabianhorses.org/.content/judges-stewards/js-docs/JS_NB_Western_Pleasure.pdf) describes Western shirts, hats and optional outer layers. We also consulted the Australian Quarter Horse Association's [2026 rulebook](https://www.aqha.com.au/rulebook), including its Western and sporting attire sections. This is the Australian association, not the American AQHA; the American rulebook landing page returned an access restriction. Plaid, scarf and embellishment choices are artistic interpretations, not universal class requirements. The barrel portrait intentionally uses a riding helmet.
- **Arabian Mounted Native Costume:** the show-class-specific portrait uses an aba-style cloak, geometric trim, a draped kuffiyeh-style headcloth and an ighal-style cord. The primary basis is AHA's [Mounted Native Costume judges guide, attire section](https://www.arabianhorses.org/.content/judges-stewards/js-docs/JS_NB_Native_Costume.pdf) and its [educational costume guide](https://www.arabianhorses.org/export/content.export/youth-docs/AHYA_Native-Costume-Flyer.pdf). This represents a named equestrian show class inspired by Bedouin garments, not a universal Arabian rider outfit. No weapons, fantasy props, religious symbols or caricature features are used.

The PDFs carry their own effective dates, which may precede the research date. Designs are simplified to head-and-shoulder portraits, so trousers, boots, chaps and coat tails are generally outside the crop. Helmets/derbies/hats shown in an avatar are visual identity choices, not safety-equipment certification or competition advice.

## Collection

| Collection | New portraits | New free choice | New premium choices |
| --- | --- | --- | --- |
| English | 6 | Schooling rider | Hunter, jumper, dressage, cross-country, saddle seat |
| Western | 5 | Ranch rider | Western pleasure, reining, barrel, trail |
| Arabian | 4 | Country pleasure | English pleasure, hunter pleasure, Mounted Native Costume |

All premium choices follow the existing $0.99 USD base one-time purchase model and verified ownership checks. New paid product IDs still need merchant configuration. No existing selections or entitlements are replaced.

[Open the visual preview](avatar-wardrobe-preview.html). Regenerate the added SVGs with `node scripts/build-rider-avatars.mjs`.
