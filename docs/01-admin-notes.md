---
title: Salt Safari Admin
aliases:
  - "Salt Safari Admin add517e2f50f4835ba88a98f63722155"
tags:
  - "private-shared"
---
# Salt Safari Admin

Find a more minimal widget that loads faster. If I can’t find one then change the title to detailed forecast.

Putting in 🧭 direction of beach too as it helps with the forecast.

[[Insta embed loading problem]]

[[Super.so](http://Super.so) code](The%20Dive%20List%20Admin/Super%20so%20code%206f333110c60c42a2904962ba8baac16e.md)

# Roadmap

## Acquisition

Affiliate marketing by guys like Tom Park. They’ve got their channels and fans. I’ve got the monetised gig. Put the two together!

Works best if there’s a membership subscription. This means having more useful features. Dive log, etc. Which means using Bubble, not Notion.

## Referrals

Make one referral (they just have to click the link) and unlock one secret location in your region?

* This is an edge that other sites won’t have.

Marketing my website is a potentially huge challenge, and being able to have a referral program is likely make or break for my site.

I'm imagining a refer-a-friend program

[like Morning Brew](https://www.referralcandy.com/blog/morning-brew-referral-program#:~:text=Referral%20rewards%20are%20encouraged%20from,of%20a%20Premium%20Sunday%20Newsletter.)

where users get a unique referral link, and when people click on it the referrer unlocks restricted content.

Maybe one integration could handle the referrals and another could handle unlocking restricted content.

There are services like Rewardful (seems to integrate with Outseta, but can’t restrict content solo), GrowSurf (integrates with Zapier but can’t restrict content by itself), ReferralRock (integrates with Zapier but can’t restrict content by itself)

InviteBox mentions hidden content, I’ve emailed them to clarify.

**Emailed Outseta to see if they can restrict content on Super.so. They  have a Zaiper integration and *seem* to already integrate with Super.so**

**Memberstack integrates w/ referral software through Zapier with [a special invite link](https://zapier.com/developer/public-invite/23711/4e5c646add22a529e1b64022daeb5a4d/), but not with Super.so to restrict content (t[hough they’ve spoken about it](https://community.super.so/c/questions/when-can-we-expect-the-membership-feature-to-be-available)).**

**MemberSpace’s Zapier integration is weak and can’t update member data. I’ve emailed them to see if it’s on the roadmap. They integrate with [Super.so](http://Super.so) and can restrict content.**

Ideally [Super.so](http://Super.so) would integrate with a rewards software that can restrict content so I don’t have to pay for 2 services. But I want to mention the option of integrating with a membership service.

I might have to send out rewards in an email…..

Or send out the password to unlock.

This is a good site for referral software:

[The 13 Best Referral Program Software Tools [2022]](https://www.growthmarketingpro.com/referral-program-software/)

## Adding dive center database

New database, fill it up with operators, then link them with the locations they service.

Make them appear on the regional page too.

## Memberships

Get access to lesser known sites and join our community of enthusiasts.

Membership via Memberspace

* $29/m <https://www.memberspace.com/signup/>
* <https://www.memberspace.com/notion-membership-site/>

There is Terrace which is Super + Memberspace in one. But they can’t filter my databases.

I reckon I’ll make money through trips and gear though.

Collect data on when it’s the best time to snorkel/dive each site. High tide, whatever. Then get an API connection for tide data.

Now if that good time is during the daytime, send users a notification when it’s a good time to leave to get in the water.

## Recreate the site away from Notion

Or maybe make it an app.

* Huge list of filters to apply right on the homepage.
### Make all filters have their own URLs to get long tail keywords.

<https://marketingexamples.com/seo/long-tail-keywords>

Trying to think about what this would look like. Different pages for

1. Snorkelling in Sydney
2. Diving in Sydney

* Put some filters behind a paywall
* Access users location, and sort places by distance.
* Access a dive planner
* Alerts when it’s a good time to swim

# Kids book

The wonders of the ocean.

# Competing sites

Inspiration: SurferList.

<https://mobile.twitter.com/bentossell/status/1511419871417958400?s=12&t=ILdUnvbn-9-eKv-CkwS1-Q>

Tripadvisor has recommendations.

<https://www.tripadvisor.com.au/Attractions-g255068-Activities-c61-t194-Brisbane_Brisbane_Region_Queensland.html>

[[zubluediving com|zubluediving.com]]

DivePlanIt

* <https://www.similarweb.com/website/diveplanit.com/>

<https://www.padi.com/dive-sites/new-south-wales/?ordering=-rating%2C-number_reviews>

* Good site descriptions, but not many of them
* No species.
* Decent app, focuses on booking experiences

Zentacle. <https://www.zentacle.com/>

* <https://www.similarweb.com/website/zentacle.com/#overview>
* Poor quality descriptions. But 15,000+ entries.
* No species
* Decent app, focuses on its many locations, dive logs, and messaging dive buddies.
* [Launched 2019](https://www.patreon.com/m/zentacleapp)

<https://www.snorkeling-report.com/spot/snorkeling-kurnell-sydney/>

* <https://www.similarweb.com/website/snorkeling-report.com/#overview>
* Great quality descriptions. But not many of them
* Highly specific species

Water Tourist <https://www.watertourist.com/>

* Australia/Hawaii only
* Mediocre.

# DNS & Proxy

Domain registrar = Name.com

Name.com’s [name servers](https://www.name.com/account/domain/details/saltsafari.app#details) have been set to those specified by Cloudfare. So traffic is sent there.

Cloudfare looks after DNS management. (In Cloudfare > Divelist > DNS). They’ve been set according to [instructions set by Super](https://docs.super.so/custom-domain).

* DNS records for MX (email) also point to Gmail.

Cloudfare’s proxy has also been set up, [instructions also set by Super](https://docs.super.so/cloudflare-proxy).

There’s a [link to check if it’s set up properly](https://www.whatsmydns.net/#A/saltsafari.app) on [this page](https://super.so/guides/dns/cloudflare).

Then I’ve used Cloudfare to set up a page rule that redirects the master database page to the homepage, according to [instructions from Super](https://community.super.so/c/wishlist/a-way-to-hide-a-master-database#comment_wrapper_8796901).

[Zentacle customer survey (1)](Salt Safari Admin/Zentacle customer survey (1)%201ea0f29f2a9c4ea8a2d28e79d594aa23.md)

[[Ettiquite]]

[[To do]]

# Endgame

Chrissy mentioned that guy was looking to buy digital assets like this.

[Master places database (1)](Salt Safari Admin/Master places database (1)%201932803cf00f48468c68059a6b0e3393.csv)
