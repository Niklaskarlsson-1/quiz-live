// Frågebanken som läggs in i databasen av seed.ts.
// Rätt svar är alltid det första alternativet här; servern blandar
// ordningen för varje spel, så att man inte kan lära sig positionerna.

export interface SeedQuestion {
  category: string;
  text: string;
  answer: string;
  wrong: [string, string, string];
}

export const QUESTIONS: SeedQuestion[] = [
  // ---------- Geografi ----------
  { category: 'Geografi', text: 'Vilken är Sveriges största sjö?', answer: 'Vänern', wrong: ['Vättern', 'Mälaren', 'Storsjön'] },
  { category: 'Geografi', text: 'Vad heter Australiens huvudstad?', answer: 'Canberra', wrong: ['Sydney', 'Melbourne', 'Perth'] },
  { category: 'Geografi', text: 'Vilket land har flest invånare i världen?', answer: 'Indien', wrong: ['Kina', 'USA', 'Indonesien'] },
  { category: 'Geografi', text: 'Vilket är världens största hav?', answer: 'Stilla havet', wrong: ['Atlanten', 'Indiska oceanen', 'Norra ishavet'] },
  { category: 'Geografi', text: 'Vad heter Kanadas huvudstad?', answer: 'Ottawa', wrong: ['Toronto', 'Vancouver', 'Montréal'] },
  { category: 'Geografi', text: 'Vilket är världens högsta berg över havet?', answer: 'Mount Everest', wrong: ['K2', 'Kilimanjaro', 'Mont Blanc'] },
  { category: 'Geografi', text: 'Vilket är Sveriges högsta berg?', answer: 'Kebnekaise', wrong: ['Sarektjåkkå', 'Helagsfjället', 'Åreskutan'] },
  { category: 'Geografi', text: 'I vilket land ligger Machu Picchu?', answer: 'Peru', wrong: ['Mexiko', 'Chile', 'Bolivia'] },
  { category: 'Geografi', text: 'Vilken världsdel är störst till ytan?', answer: 'Asien', wrong: ['Afrika', 'Nordamerika', 'Antarktis'] },
  { category: 'Geografi', text: 'Vilken är världens största varma öken?', answer: 'Sahara', wrong: ['Gobi', 'Kalahari', 'Atacama'] },
  { category: 'Geografi', text: 'Vilket land har formen av en stövel?', answer: 'Italien', wrong: ['Grekland', 'Portugal', 'Kroatien'] },
  { category: 'Geografi', text: 'Vad heter Islands huvudstad?', answer: 'Reykjavik', wrong: ['Akureyri', 'Tórshavn', 'Nuuk'] },

  // ---------- Vetenskap ----------
  { category: 'Vetenskap', text: 'Vilket är det kemiska tecknet för guld?', answer: 'Au', wrong: ['Ag', 'Gd', 'Go'] },
  { category: 'Vetenskap', text: 'Hur många planeter finns det i vårt solsystem?', answer: '8', wrong: ['7', '9', '10'] },
  { category: 'Vetenskap', text: 'Vilken är den största planeten i vårt solsystem?', answer: 'Jupiter', wrong: ['Saturnus', 'Neptunus', 'Jorden'] },
  { category: 'Vetenskap', text: 'Vid hur många grader Celsius kokar vatten vid havsytans nivå?', answer: '100', wrong: ['90', '110', '120'] },
  { category: 'Vetenskap', text: 'Vilken gas tar växter upp vid fotosyntesen?', answer: 'Koldioxid', wrong: ['Syre', 'Kväve', 'Väte'] },
  { category: 'Vetenskap', text: 'Hur många ben har en spindel?', answer: '8', wrong: ['6', '10', '12'] },
  { category: 'Vetenskap', text: 'Vad är H₂O?', answer: 'Vatten', wrong: ['Väteperoxid', 'Salt', 'Koldioxid'] },
  { category: 'Vetenskap', text: 'Vilken planet kallas "den röda planeten"?', answer: 'Mars', wrong: ['Venus', 'Merkurius', 'Jupiter'] },
  { category: 'Vetenskap', text: 'Ungefär hur snabbt färdas ljuset i vakuum?', answer: '300 000 km/s', wrong: ['30 000 km/s', '3 000 km/s', '3 000 000 km/s'] },
  { category: 'Vetenskap', text: 'Vem formulerade relativitetsteorin?', answer: 'Albert Einstein', wrong: ['Isaac Newton', 'Niels Bohr', 'Marie Curie'] },
  { category: 'Vetenskap', text: 'Vilket är det hårdaste naturliga materialet?', answer: 'Diamant', wrong: ['Granit', 'Kvarts', 'Järn'] },
  { category: 'Vetenskap', text: 'Vilket organ pumpar runt blodet i kroppen?', answer: 'Hjärtat', wrong: ['Levern', 'Lungorna', 'Njurarna'] },

  // ---------- Historia ----------
  { category: 'Historia', text: 'Vilket år landade människan för första gången på månen?', answer: '1969', wrong: ['1961', '1972', '1957'] },
  { category: 'Historia', text: 'Vilket år föll Berlinmuren?', answer: '1989', wrong: ['1991', '1985', '1979'] },
  { category: 'Historia', text: 'Vem var USA:s första president?', answer: 'George Washington', wrong: ['Thomas Jefferson', 'Abraham Lincoln', 'John Adams'] },
  { category: 'Historia', text: 'Vilket år började första världskriget?', answer: '1914', wrong: ['1912', '1918', '1939'] },
  { category: 'Historia', text: 'Vilket år tog andra världskriget slut?', answer: '1945', wrong: ['1944', '1946', '1939'] },
  { category: 'Historia', text: 'Vilket år valdes Gustav Vasa till Sveriges kung?', answer: '1523', wrong: ['1397', '1611', '1718'] },
  { category: 'Historia', text: 'Vilket år sjönk regalskeppet Vasa?', answer: '1628', wrong: ['1523', '1709', '1801'] },
  { category: 'Historia', text: 'Vilka byggde pyramiderna i Giza?', answer: 'De forntida egyptierna', wrong: ['Romarna', 'Grekerna', 'Perserna'] },
  { category: 'Historia', text: 'Vem målade Mona Lisa?', answer: 'Leonardo da Vinci', wrong: ['Michelangelo', 'Rafael', 'Rembrandt'] },
  { category: 'Historia', text: 'Vilket fartyg sjönk på sin första resa 1912?', answer: 'Titanic', wrong: ['Lusitania', 'Estonia', 'Vasa'] },
  { category: 'Historia', text: 'Vem utvecklade boktryckarkonsten med lösa typer i Europa?', answer: 'Johannes Gutenberg', wrong: ['Martin Luther', 'Galileo Galilei', 'William Caxton'] },
  { category: 'Historia', text: 'Vilket år gick Sverige med i EU?', answer: '1995', wrong: ['1986', '1992', '2001'] },

  // ---------- Spel & teknik ----------
  { category: 'Spel & teknik', text: 'Vad står CPU för?', answer: 'Central Processing Unit', wrong: ['Computer Power Unit', 'Central Program Utility', 'Core Processing Upload'] },
  { category: 'Spel & teknik', text: 'Vilket företag utvecklar World of Warcraft?', answer: 'Blizzard Entertainment', wrong: ['Riot Games', 'Valve', 'Bethesda'] },
  { category: 'Spel & teknik', text: 'Vilket år släpptes World of Warcraft i Nordamerika?', answer: '2004', wrong: ['2001', '2006', '2008'] },
  { category: 'Spel & teknik', text: 'Vad står HTML för?', answer: 'HyperText Markup Language', wrong: ['High Tech Modern Language', 'HyperTool Multi Language', 'Home Text Markup Logic'] },
  { category: 'Spel & teknik', text: 'Vilket språk bygger TypeScript vidare på?', answer: 'JavaScript', wrong: ['Java', 'C#', 'Python'] },
  { category: 'Spel & teknik', text: 'Vilket svenskt företag skapade Minecraft?', answer: 'Mojang', wrong: ['DICE', 'King', 'Paradox Interactive'] },
  { category: 'Spel & teknik', text: 'Hur många bitar består en byte av?', answer: '8', wrong: ['4', '16', '10'] },
  { category: 'Spel & teknik', text: 'Vem grundade Microsoft tillsammans med Paul Allen?', answer: 'Bill Gates', wrong: ['Steve Jobs', 'Steve Wozniak', 'Larry Page'] },
  { category: 'Spel & teknik', text: 'Vad står "www" för i webbadresser?', answer: 'World Wide Web', wrong: ['Wide World Website', 'Web World Wide', 'World Web Window'] },
  { category: 'Spel & teknik', text: 'Vilket år släpptes den första iPhonen?', answer: '2007', wrong: ['2005', '2009', '2010'] },
  { category: 'Spel & teknik', text: 'Vilket företag skapade spelserien The Legend of Zelda?', answer: 'Nintendo', wrong: ['Sega', 'Sony', 'Capcom'] },
  { category: 'Spel & teknik', text: 'Vad kallas ett fel i ett datorprogram?', answer: 'En bugg', wrong: ['En patch', 'En loop', 'En cache'] },
];
