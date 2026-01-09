// src/config/leagues.ts
// Static list of top FA Full-Time leagues for selection/search filters

export interface LeagueOption {
  name: string;
  url: string;
}

export const TOP_FA_LEAGUES: LeagueOption[] = [
  {
    name: "Central Warwickshire Youth Football League",
    url: "https://fulltime.thefa.com/index.html?league=4385806"
  },
  {
    name: "Eastern Junior Alliance",
    url: "https://fulltime.thefa.com/index.html?league=257944965"
  },
  {
    name: "Northumberland Football League",
    url: "https://fulltime.thefa.com/index.html?league=136980506"
  },
  {
    name: "East Manchester Junior Football League ( Charter Standard League )",
    url: "https://fulltime.thefa.com/index.html?league=8335132"
  },
  {
    name: "Surrey Youth League (SYL)",
    url: "https://fulltime.thefa.com/index.html?league=863411662"
  },
  {
    name: "Teesside Junior Football Alliance League",
    url: "https://fulltime.thefa.com/index.html?league=8739365"
  },
  {
    name: "Sheffield & District Junior Sunday League",
    url: "https://fulltime.thefa.com/index.html?league=5484799"
  },
  {
    name: "BCFA Youth League",
    url: "https://fulltime.thefa.com/index.html?league=671683416"
  },
  {
    name: "Midland Junior Premier League",
    url: "https://fulltime.thefa.com/index.html?league=1182044"
  },
  {
    name: "YEL East Midlands SATURDAY",
    url: "https://fulltime.thefa.com/index.html?league=5628447"
  }
  // ...add more as needed
];
