# 🚀 Restaurant Onboarding Dashboard

A simple dashboard to quickly onboard new restaurants to your system. Create owners, generate prefilled form links, and send them via WhatsApp - all from one place!

## ✨ Features

- **Quick Onboarding**: Add new restaurants in seconds
- **Auto-generated Links**: Get prefilled Google Form links instantly
- **WhatsApp Ready**: Copy formatted message with all links
- **Existing Owners**: View and regenerate links for existing restaurants
- **Search & Filter**: Find restaurants quickly
- **Beautiful UI**: Clean, modern interface with Tailwind CSS

## 📋 Prerequisites

- Node.js 18+ installed
- Your Supabase project URL and anon key
- Edge functions deployed (`onboard-owner` and `generate-owner-links`)

## 🛠️ Setup

### 1. Install Dependencies

```bash
cd onboarding-dashboard
npm install
```

### 2. Configure Environment

Copy the example env file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Run the Dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## 📱 How to Use

### Onboarding a New Restaurant:

1. **Fill the form** with:
   - Restaurant name
   - WhatsApp number (will be formatted automatically)
   - Email (optional)

2. **Click "Cadastrar e Gerar Links"**
   - Creates owner in database
   - Generates unique token
   - Returns prefilled form links

3. **Copy the WhatsApp message**
   - Click "Copiar Mensagem WhatsApp"
   - Paste in WhatsApp to the owner
   - They save the links and start using!

### For Existing Restaurants:

1. Click on "X cadastrados" to see all restaurants
2. Search for the restaurant
3. Click "Gerar Links" to get their links again
4. Copy and send!

## 🔗 Generated Links

Each restaurant gets 4 personalized links:
- 📊 **Vendas Diárias** - Daily sales form
- 👥 **Cadastrar Funcionário** - Employee registration
- ⏰ **Registro de Turnos** - Work shifts logging
- 📦 **Pedidos Recebidos** - Purchase orders

## 🎯 What Happens Behind the Scenes

1. **Owner Creation**: Calls `/functions/v1/onboard-owner`
2. **Token Generation**: Unique token created for identification
3. **Link Generation**: Prefilled Google Form URLs with token
4. **Data Collection**: Forms submit to your edge functions
5. **Auto-identification**: Token links all data to correct owner

## 🚨 Important Notes

- Phone numbers are auto-formatted to Brazilian format
- Links are permanent - save them!
- Each restaurant has a unique token
- Test mode supports first 5 restaurants (WhatsApp limitation)

## 🔧 Troubleshooting

### "Failed to onboard owner"
- Check your Supabase URL and anon key
- Verify edge functions are deployed
- Check browser console for detailed errors

### Links not working
- Ensure form_config table has all form IDs
- Check that Google Forms have "Owner Token" field
- Verify Apps Script is deployed

### Can't see existing owners
- Check RLS policies on owners table
- Verify anon key has read permissions

## 🚀 Next Steps

Once Stripe is integrated:
1. Webhook creates owner automatically
2. Sends welcome email with links
3. Fully automated onboarding!

## 📞 Support

Having issues? Check:
- Edge function logs in Supabase dashboard
- Browser console for errors
- Network tab for API responses

---

Built with ❤️ for restaurant owners who deserve simple tools
