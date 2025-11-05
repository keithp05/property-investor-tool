# 🔑 Add Environment Variables to Vercel - Get Live Data!

## Quick Steps to Get Real Property Data

### 1. Go to Vercel Dashboard
Visit: **https://vercel.com/dashboard**

### 2. Find Your Project
Click on: **property-investor-tool**

### 3. Go to Settings
Click: **Settings** → **Environment Variables**

### 4. Add These Variables

Copy and paste each one:

---

#### **NEXTAUTH_URL**
```
Production: https://property-investor-tool.vercel.app
```
(Replace with your actual Vercel URL - it's shown at the top of your project page)

---

#### **NEXTAUTH_SECRET**
```
+iDFW+VO4WJx4wXSb9Q0NV9n8hQeEzYmZvg2e6SYvRA=
```

---

#### **BRIGHT_DATA_API_TOKEN** (This gives you REAL property data!)
```
b773aaf2-a632-459f-b217-5d38368db5f6
```

---

#### **BRIGHT_DATA_DATASET_ID**
```
gd_lwh4f6i08oqu8aw1q5
```

---

#### **OPENAI_API_KEY** (Optional - for AI-powered CMA reports)
```
[Leave empty for now, or add your OpenAI key if you have one]
```

---

### 5. Select Environment
For each variable, select:
- ✅ **Production**
- ✅ **Preview** (optional)
- ✅ **Development** (optional)

### 6. Click "Save"

### 7. REDEPLOY
**IMPORTANT**: After adding all variables, you MUST redeploy!

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Wait 2-3 minutes for deployment to complete

---

## ✅ After Redeployment

Your app will now have:
- ✅ **REAL property data** from Bright Data (100K+ listings)
- ✅ **Auction properties** with real dates
- ✅ **County records** integration
- ✅ **Craigslist listings**
- ✅ Secure authentication with NextAuth

---

## 🧪 Test Your Live App

1. Visit your Vercel URL
2. Search for properties: "Austin, TX" or "San Antonio, TX"
3. You should now see REAL properties (not just demo data!)
4. Click on a property to see details
5. Try the CMA report (if you added OPENAI_API_KEY)

---

## 📊 What Data You'll Get

### With Bright Data API (100K Records Package):
- ✅ Real Zillow listings
- ✅ Google search results for properties
- ✅ Property details (price, beds, baths, sqft)
- ✅ Photos and descriptions
- ✅ Contact information
- ✅ Historical data

### Demo Data Fallback:
If Bright Data returns 0 results for a search, the app automatically shows 10 demo properties so you can still test the UI.

---

## 🎯 Your Live URL

Find it at the top of your Vercel project page:
- Should be: `https://property-investor-tool.vercel.app`
- Or: `https://property-investor-tool-[username].vercel.app`

---

## 🔐 Security Note

These environment variables are:
- ✅ Encrypted by Vercel
- ✅ Never exposed in browser
- ✅ Only accessible server-side
- ✅ Not included in git repository

---

## ❓ Need Help?

If you don't see your Vercel URL or can't find your project:
1. Check your email - Vercel sends deployment confirmation
2. Make sure you're logged into the correct GitHub account
3. Look for recent deployments in the Vercel dashboard

**Once you've added the variables and redeployed, share your live URL and I'll help you test it!** 🚀
