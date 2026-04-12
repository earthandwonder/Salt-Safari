---
title: To do
aliases:
  - "To do 386df03a6e644dac9553d4819981dc07"
tags:
  - "private-shared"
  - "salt-safari-admin"
---
# To do

# Content

* [x]  Fix the database glitch
* [x]  Buy a domain
* [x]  Can I prevent google from indexing the Places via the Master Places Database? Because I only want it to find them via the linked view databases. **Submitted a community post.**
  * [x]  Then submit the sitemap to Google Search Console
* [x]  <https://super.so/guides/seo>
* [x]  <https://super.so/guides/optimize>
* [x]  Embeds take *way* too long to load.
* [ ]  Bitly links are public. Change to another one where I can still pull the stats.

Put the Google analytics tracker in the [bit.ly](http://bit.ly) url shortener. So they can see for themselves where their traffic has come from and even converted.

* [ ]  Finish the Sydney and Central coast places and species
  * [ ]  [Sydney conditions details](https://www.michaelmcfadyenscuba.info/viewpage.php?page_id=909)
  * [ ]  Ask [Super.so](http://Super.so) if they’d like to add it to their [showcase](https://super.so/showcase)
* [ ]  Regions aren’t working in the Species info section
* [ ]  Find a SEO guru
* [ ]  Move all new locations into the right regions in the Pages screen
* [ ]  Add migrations/seasonality to species

# Feedback

Get feedback on design, speed, features. Send to

* [x]  James (ask if he has any diving/snorkeling friends), get his help with launching on ProductHunt
* [x]  Rach (ask if she has any diving/snorkeling friends)
* [ ]  Tom park. Add his videos. Ask if he has a contact at tourism nsw or whoever commissioned his videos, or if he knows any organisation that may be interested in linking to the site.
* [ ]  Facebook Groups

# SEO terms

Should I use ‘snorkeling’ in the pages for countries that spell it that way, and ‘snorkelling’ in pages for countries that spell it that alternate way?

| **Term** | **Notes** | **Page** | **Content** | **Backlinks** |
| --- | --- | --- | --- | --- |
| Dive list | Simple | [Homepage](https://www.notion.so/23ba86c996ea44e7b654d009e3f96ea6?pvs=21) | Keyword as a page title | Facebook Groups, Maybe Australian Geographic, maybe UTS, ProductHunt |
| Scuba diving near me | How does this work? | [[_Sydney]], [[_Central Coast]] (depending on user’s location) | Keyword as a h1 tag | Check existing backlinks on this search |
| Snorkelling near me | How does this work? | [[_Sydney]], [[_Central Coast]] (depending on user’s location) | I have Snorkeling in Sydney, Australia in H1 tags | Check existing backlinks on this search |
| [[Master places database|[place]]] snorkeling | E.g. ‘Shelly beach snorkeling’. | Each of the place pages that are tagged with snorkelling | Key phrase is in a H1 tag |  |
| [[Master places database|[place]]] scuba diving | E.g. ’Bare Island scuba diving’. | Each of the [[Master places database|places]] tagged with diving | Key phrase is in a H1 tag |  |
| [[Master places database|[place]]] diving | Just a phrase variation of [place] scuba diving |  |  |  |
| [[Master places database|[place]]] snorkelling | Just a spelling variation of [place] snorkeling   |  |  |  |

For the ‘…near me’ searches, I need a step by step process for repeating it for locations. Next is South Coast, then Brisbane, etc.

# Backlinks

* [ ]  [Super.so](http://Super.so) showcase
* [ ]  Prof William Gladstone. Any place on the UTS website for it? It’s an .edu domain
* [ ]  Chrissy Goldrick. Any place on the Australian Geographic website for it?
* [ ]  NSW travel site
* [ ]  Local scuba companies
* [ ]  Subnautica

# Non essential content

* [ ]  Add a Size section in species, that’s an image of the creature next to a person. Watermark with Salt Safari logo.

# Fill out US & Europe

* [ ]  US dive sites
* [ ]  Europe Dive sites
* [ ]  Launch on Reddit
* [ ]  Launch on Product Hunt (get James’ help)

# Migrations

When are species in certain regions?

# Current water temperature

Just update it for all of the region I think.

# Good conditions logic

Goal: Filter regional locations by ‘Good conditions now’.

This is reasonably complex and needs regularly updated live data, and unfavourable conditions data on each location.

But, a complication. **Each location may have multiple dives. E.g. East Bare Island & West Bare Island. They have a different set of unfavourable conditions. So use different pages for each dive? They may have different species as well as different conditions. Or just use the data for the most forgiving dive, and note on the description which one you’d be better off doing in which weather.**

* This uses ‘current conditions’ (I think for each location) (wind direction, wind speed, swell direction, swell height) that are constantly updated into properties (hourly?) by Integromat. It gets this info for the next (3 hours?)
* It also uses ‘unfavourable (uf) conditions’ properties for each location (uf wind direction, uf wind speed, general wind speed, uf swell direction, uf swell height, general swell height) and applies a formula.
* Locations may have a wind direction and wind speed combination that are unfavourable to them.
  * If (current wind direction = uf wind direction & current wind speed > uf wind speed)
* Locations may also have a general wind speed that if exceeded will
  * Or if (wind speed > uf general wind speed)
* Locations may have a swell direction and swell height combination that are unfavourable to them.
  * If (current swell direction = uf swell direction & current swell height > uf swell height)
### Locations may also have a general swell height that if exceeded will

* Or if (swell height > general swell height)

I just threw these together so they may not be correct.

They will all go into a formula in the ‘Good conditions now’ property and if they’re all false, conditions for that location are good.

But it can be implemented step by step.

1. Put in unfavourable conditions data for each location.

People will be able to compare it directly to the Forecast tab and make up their own minds.
