/** Adapted from Emma MacLaren's nine supplied voice memos, 7–8 November 2026. */
export const emmaEditorial = {
  paperwork: {
    title: "Why the paperwork matters",
    paragraphs: [
      "The simplest case is a living owner who bought the property and still has the deed. It becomes more involved when the original owner has died, the deed is missing, or several people have an interest in the spaces. The cemetery needs a documented chain showing who has the authority to sell and whose consent is required.",
      "The cemetery is not trying to be difficult. It is being precise for a reason: a space must not be transferred to the wrong person. Texas Cemetery Brokers helps gather the ownership evidence and required signatures before a buyer is waiting. A scan can help the initial review, but it does not replace a physical original where the cemetery requires one.",
    ],
  },
  emotions: {
    title: "Finding a deed can bring up more than practical questions",
    paragraphs: [
      "A family sorting through a relative’s drawers or old boxes may find a cemetery deed and think, ‘What is this? I wish I could ask them about it.’ Grief, confusion and even guilt about selling can come up at once. Finding unused spaces does not mean the family has to make a decision straight away.",
      "There is no rush to decide whether to sell. Texas Cemetery Brokers can explain the options and answer questions, but the decision belongs to the people involved. If other owners or heirs have an interest, they need to be included. The broker helps with the process; it does not pressure relatives or resolve family disputes.",
    ],
  },
  resale: {
    title: "A price list is a starting point, not a resale valuation",
    paragraphs: [
      "A cemetery’s quoted retail list price is not necessarily what a buyer will pay for a comparable purchase. Cemeteries may offer bundled spaces, financing or promotional incentives. A seller competes with those offers, not just the number on the price board.",
      "A secondary-market property has to offer genuine value. A buyer might want a particular location that the cemetery no longer has available, but many families also want to spend less. That is why a realistic resale valuation looks at current demand, comparable offers and the full cost of the transfer rather than simply copying the cemetery’s list price.",
    ],
  },
  demand: {
    title: "A beautiful plot still needs the right buyer",
    paragraphs: [
      "The cemetery matters, but so does the particular position. A view, a mature tree, easy access from the road or a level route for a relative using a wheelchair can make a difference. What suits one family may not suit another, and a familiar cemetery name alone does not establish the value of a space.",
      "The type and grouping matter too. A single space or a pair serves a different buyer from a family estate that must stay together. An awkward grouping, limited local demand or a hopeful asking price can make a property harder to place. A lower price alone cannot create buyers where there is little demand; neither a sale nor a deadline is guaranteed.",
    ],
  },
  planning: {
    title: "Time to choose, and time to talk as a family",
    paragraphs: [
      "Buying ahead gives a family time to visit, look at everything that interests them and involve the people they want in the decision. They can choose a place in a relaxed way, discuss how to pay for it and know what has been arranged. Fixing the purchase price now is a budgeting decision, not a promise of future appreciation.",
      "After a death, grief may arrive alongside funeral costs, medical bills and travel arrangements. If a loved one is in hospice or approaching the end of life, making arrangements can also take time away from being with them. Families can still be helped through an urgent purchase, without being blamed for not having planned earlier.",
    ],
  },
  buyerChecks: {
    title: "Before falling in love with a space",
    paragraphs: [
      "A beautiful location is only part of the decision. Compare a suitable resale space with the cemetery’s own offer, and check the transfer rules before paying a private seller. Ask for the full purchase cost, including the cemetery transfer fee and any buyer fee, with burial services, a vault and a marker clearly identified if they are separate.",
      "Think about who will actually visit. A place can be lovely and still be too far away or too difficult for the family to reach. If plans might change, ask whether resale is permitted, what it involves and what the likely market value might be. Being allowed to resell is not the same as being certain to recover the purchase price.",
    ],
  },
  sellerChecks: {
    title: "What can hold a sale up",
    paragraphs: [
      "A busy cemetery is not the same as a busy resale market. People visiting each weekend may be visiting relatives, not shopping for a plot. Finding a buyer for a specific space takes reach and patience, and an attractive number on paper is not the same as a completed sale.",
      "Bring co-owners into the conversation early. They may want to discuss the price, take time to decide or need to be located. Missing ownership documents or an unresolved signature can stall a sale just when a buyer is ready. A broker can explain the requirements and organize the work, but cannot replace a required owner’s consent.",
      "When choosing a broker, ask about completed transactions, how buyers are reached, the work included and the fees. A higher promised return is not enough on its own: the property still has to sell. Compare realistic advice and evidence of completed work, not just the most appealing valuation.",
    ],
  },
  types: {
    title: "Choose the type, then check the details",
    paragraphs: [
      "A ground burial space is the traditional choice for a casket. A lawn crypt has a container pre-installed below ground; other ground spaces may require a vault or liner to be purchased when used. The cemetery and the particular section decide what is required and whether a flat marker or upright monument is permitted.",
      "A cremation niche holds an urn in a columbarium, while an urn space is for burial of cremated remains in the ground. A mausoleum crypt holds a casket above ground; indoor and outdoor settings feel different, and the height of the crypt affects how easily relatives can reach flowers or read the inscription. Check the actual capacity and access rather than assuming all spaces are alike.",
      "A family estate keeps a group of spaces together and may include benches, borders or other features. It is not automatically divisible for resale: the deed and cemetery’s consent matter. A cenotaph is different again—a memorial to someone whose remains are elsewhere, rather than a space containing those remains. Availability and transferability must be checked separately.",
    ],
  },
} as const;

export type EmmaTopic = keyof typeof emmaEditorial;

export const emmaMetroNotes: Record<string, { title: string; text: string }> = {
  dallas: { title: "Compare the section, not just the Dallas cemetery name", text: "A well-known cemetery may be the starting point, but the individual space still matters. A level route, access from a road, a mature tree or a position near family can matter more to a buyer than prestige. Texas Cemetery Brokers helps Dallas–Fort Worth families compare the actual location, the type of space and the complete transfer costs before deciding." },
  houston: { title: "A Houston plot should work for the people who will visit", text: "A family can love a resting place and still find it too far away or difficult to reach. Before choosing in Greater Houston, consider where relatives live, the journey they will make and access within the grounds. Compare the cemetery’s offer with suitable resale spaces, and confirm which services and transfer charges are separate." },
  austin: { title: "Planning ahead leaves room for the family conversation", text: "Austin families buying ahead can visit the grounds, compare different sections and involve the people they want in the decision. It is a chance to discuss the resting place and the budget without the pressure of an immediate loss. If a move or a change of plans is possible, ask about resale restrictions and likely resale value—not just whether a later sale is technically permitted." },
  "san-antonio": { title: "Prepare the ownership file before a buyer is waiting", text: "For San Antonio sellers, a deed is the starting point rather than the whole file. When spaces have passed through a family or have several owners, the cemetery needs evidence of authority and the required consent. Involving relatives early can prevent a missing signature from delaying a sale. Texas Cemetery Brokers helps organize the documents, without pressuring anyone to sell." },
};