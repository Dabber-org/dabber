'use client'

import { useState, useEffect } from 'react'
import { PageLayout } from '@/shared/ui/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cartService } from '@/features/cart/service'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSection {
  title: string
  items: FAQItem[]
}

const faqSections: FAQSection[] = [
  {
    title: 'General Questions',
    items: [
      {
        question: 'What is ElectroStore?',
        answer:
          'ElectroStore is your trusted destination for the latest electronics and technology. We offer a wide range of mobile phones, laptops, desktop computers, and other electronic devices from top brands at competitive prices.',
      },
      {
        question: 'How do I create an account?',
        answer:
          'You can create an account by clicking on the "Sign Up" button in the top navigation. Simply provide your email address, create a password, and you\'ll be ready to start shopping. Having an account allows you to track orders, save your shipping information, and enjoy a faster checkout experience.',
      },
      {
        question: 'Do I need an account to make a purchase?',
        answer:
          "While you can browse our products without an account, you'll need to create an account to complete a purchase. This helps us provide you with order tracking, order history, and better customer service.",
      },
      {
        question: 'How can I contact customer support?',
        answer:
          'You can reach our customer support team through the contact form on our website, or by emailing support@electrostore.com. Our team is available Monday through Friday, 9 AM to 6 PM EST. For urgent matters, please call our support hotline at 1-800-ELECTRO.',
      },
      {
        question: 'Is my personal information secure?',
        answer:
          'Yes, we take your privacy and security seriously. We use industry-standard encryption to protect your personal and payment information. We never share your data with third parties without your consent, and all transactions are processed through secure payment gateways.',
      },
    ],
  },
  {
    title: 'Products & Inventory',
    items: [
      {
        question: 'What brands do you carry?',
        answer:
          'We carry a wide selection of top electronics brands including Apple, Samsung, Dell, Lenovo, HP, ASUS, and many more. Our inventory is constantly updated with the latest models and releases.',
      },
      {
        question: 'How do I know if a product is in stock?',
        answer:
          'Product availability is displayed on each product page. Items marked as "In Stock" are ready to ship immediately. If an item is out of stock, you\'ll see an estimated restock date or the option to be notified when it becomes available again.',
      },
      {
        question: 'Do you sell refurbished or used products?',
        answer:
          'We primarily sell brand new, factory-sealed products. However, we occasionally offer certified refurbished items, which are clearly marked on the product page. All refurbished products come with a warranty and have been thoroughly tested.',
      },
      {
        question: 'Can I see product specifications before purchasing?',
        answer:
          'Absolutely! Each product page includes detailed specifications, high-resolution images, customer reviews, and a comprehensive description. You can also compare products side-by-side using our comparison tool.',
      },
      {
        question: 'Do products come with warranties?',
        answer:
          'Yes, all products come with manufacturer warranties. Warranty periods vary by product and manufacturer, but typically range from 1 to 3 years. Extended warranty options are also available for purchase at checkout. Warranty details are listed on each product page.',
      },
      {
        question: 'What if I receive a damaged or defective product?',
        answer:
          "If you receive a damaged or defective product, please contact our customer support immediately. We'll arrange for a replacement or full refund. You may be asked to provide photos of the damage. We process returns and replacements within 1-2 business days.",
      },
    ],
  },
  {
    title: 'Orders & Checkout',
    items: [
      {
        question: 'How do I place an order?',
        answer:
          "Simply browse our products, add items to your cart, and proceed to checkout. You'll need to provide shipping information, select a payment method, and confirm your order. Once confirmed, you'll receive an order confirmation email with your order details and tracking information.",
      },
      {
        question: 'Can I modify or cancel my order after placing it?',
        answer:
          'You can cancel or modify your order within 1 hour of placing it by contacting customer support. After this window, orders enter our fulfillment process and cannot be modified. However, you can return items once received using our standard return policy.',
      },
      {
        question: 'How do I track my order?',
        answer:
          "Once your order ships, you'll receive a tracking number via email. You can also track your order by logging into your account and viewing your order history. Click on any order to see its current status and tracking information.",
      },
      {
        question: 'What payment methods do you accept?',
        answer:
          'We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, Apple Pay, Google Pay, and bank transfers. All payments are processed securely through encrypted payment gateways.',
      },
      {
        question: 'Is my payment information secure?',
        answer:
          'Yes, we use SSL encryption and PCI-compliant payment processors to ensure your payment information is secure. We never store your full credit card details on our servers. All transactions are processed through trusted third-party payment gateways.',
      },
      {
        question: 'Do you offer payment plans or financing?',
        answer:
          'Yes, we offer financing options through our partner providers for qualifying purchases. You can apply for financing at checkout. Options include 0% APR for 12-24 months on select items, subject to credit approval.',
      },
      {
        question: 'Will I receive an invoice or receipt?',
        answer:
          "Yes, you'll receive an email confirmation immediately after placing your order, which serves as your receipt. You can also download invoices from your account's order history section at any time.",
      },
    ],
  },
  {
    title: 'Shipping & Delivery',
    items: [
      {
        question: 'What shipping options are available?',
        answer:
          'We offer several shipping options: Standard Shipping (5-7 business days), Express Shipping (2-3 business days), and Overnight Shipping (next business day). Shipping costs vary based on the option selected and your location. Free standard shipping is available on orders over $100.',
      },
      {
        question: 'How much does shipping cost?',
        answer:
          'Shipping costs depend on the size and weight of your order, as well as your selected shipping method. Standard shipping typically costs $9.99, Express shipping is $19.99, and Overnight shipping is $29.99. Orders over $100 qualify for free standard shipping.',
      },
      {
        question: 'Do you ship internationally?',
        answer:
          'Currently, we ship within the United States and to select international destinations. International shipping rates and delivery times vary by country. Please check your cart during checkout to see if international shipping is available to your location.',
      },
      {
        question: 'Can I change my shipping address after placing an order?',
        answer:
          'You can change your shipping address within 1 hour of placing your order by contacting customer support. After this window, your order will have entered our fulfillment process and address changes may not be possible. We recommend double-checking your address before confirming your order.',
      },
      {
        question: "What if I'm not home when my package arrives?",
        answer:
          'Most carriers will leave packages at your door or in a secure location. For high-value items, a signature may be required. You can also request to have packages held at a carrier location for pickup. Check your tracking information for specific delivery instructions.',
      },
      {
        question: 'How long does delivery take?',
        answer:
          'Delivery times vary by shipping method: Standard shipping takes 5-7 business days, Express shipping takes 2-3 business days, and Overnight shipping arrives the next business day. Delivery times begin after your order ships, not when you place it. Processing typically takes 1-2 business days.',
      },
      {
        question: 'Do you offer same-day delivery?',
        answer:
          "Same-day delivery is available in select metropolitan areas for orders placed before 2 PM local time. This service is available at checkout if you're in an eligible area. Additional fees apply for same-day delivery.",
      },
    ],
  },
  {
    title: 'Returns & Refunds',
    items: [
      {
        question: 'What is your return policy?',
        answer:
          'We offer a 30-day return policy on most items. Products must be in their original condition, with all original packaging, accessories, and documentation included. Items must be unused and free from damage. Some items, such as software or personalized products, may not be eligible for return.',
      },
      {
        question: 'How do I return an item?',
        answer:
          'To return an item, log into your account, go to your order history, and select the item you want to return. Click "Return Item" and follow the prompts to generate a return label. Pack the item securely in its original packaging, attach the label, and drop it off at any carrier location.',
      },
      {
        question: 'Are return shipping costs covered?',
        answer:
          'Return shipping is free for defective or damaged items, or if we made an error with your order. For other returns, return shipping costs are deducted from your refund. However, we offer free returns on all orders during the holiday season (November-December).',
      },
      {
        question: 'How long does it take to process a refund?',
        answer:
          "Once we receive your returned item, we'll inspect it and process your refund within 3-5 business days. Refunds are issued to the original payment method. It may take an additional 5-10 business days for the refund to appear in your account, depending on your bank or credit card company.",
      },
      {
        question: 'Can I exchange an item instead of returning it?',
        answer:
          'Yes, you can request an exchange for a different size, color, or model. Exchanges are processed through our return system. Simply select "Exchange" instead of "Return" when initiating the process. If the new item costs more, you\'ll pay the difference. If it costs less, you\'ll receive a refund for the difference.',
      },
      {
        question: 'What if I received the wrong item?',
        answer:
          "If you received the wrong item, please contact customer support immediately. We'll send you a prepaid return label and ship the correct item right away at no cost to you. We apologize for any inconvenience and will ensure you receive the correct product as quickly as possible.",
      },
      {
        question: 'Can I return opened software or digital products?',
        answer:
          'Due to licensing restrictions, opened software, digital downloads, and activated products cannot be returned unless they are defective. If you experience issues with digital products, please contact our support team for assistance.',
      },
    ],
  },
  {
    title: 'Account & Profile',
    items: [
      {
        question: 'How do I update my account information?',
        answer:
          'You can update your account information by logging into your account and navigating to the "Account Settings" section. Here you can change your email address, password, shipping addresses, and payment methods. Changes are saved immediately.',
      },
      {
        question: 'I forgot my password. How do I reset it?',
        answer:
          'Click on "Sign In" and then select "Forgot Password." Enter your email address, and we\'ll send you a password reset link. Click the link in the email to create a new password. The link expires after 24 hours for security purposes.',
      },
      {
        question: 'Can I have multiple shipping addresses saved?',
        answer:
          'Yes, you can save multiple shipping addresses in your account. When checking out, you can select from your saved addresses or add a new one. This makes it easy to ship to different locations like your home, office, or gift recipients.',
      },
      {
        question: 'How do I view my order history?',
        answer:
          'Log into your account and navigate to "Order History" in your account dashboard. Here you can view all past and current orders, download invoices, track shipments, and initiate returns. Orders are organized by date with the most recent first.',
      },
      {
        question: 'Can I delete my account?',
        answer:
          'Yes, you can request account deletion by contacting customer support. Please note that deleting your account will remove all your personal information, order history, and saved preferences. We may retain certain information as required by law or for business purposes.',
      },
      {
        question: 'How do I unsubscribe from marketing emails?',
        answer:
          'You can unsubscribe from marketing emails by clicking the "Unsubscribe" link at the bottom of any marketing email, or by updating your email preferences in your account settings. You\'ll still receive important transactional emails about your orders.',
      },
    ],
  },
  {
    title: 'Warranties & Support',
    items: [
      {
        question: 'What warranty coverage do products have?',
        answer:
          'All products come with manufacturer warranties that typically range from 1 to 3 years, depending on the product type. Warranty details are listed on each product page. Extended warranty plans are also available for purchase to extend coverage beyond the standard manufacturer warranty.',
      },
      {
        question: 'How do I claim a warranty?',
        answer:
          'To claim a warranty, contact the manufacturer directly using the warranty information provided with your product. You can also contact our customer support team for assistance. We can help facilitate warranty claims and provide you with the necessary documentation.',
      },
      {
        question: 'Do you offer technical support?',
        answer:
          "Yes, we offer technical support for products purchased through ElectroStore. Our support team can help with setup, troubleshooting, and general product questions. For complex technical issues, we may refer you to the manufacturer's support team.",
      },
      {
        question: 'What if my product stops working after the warranty period?',
        answer:
          'If your product stops working after the warranty period, you can still contact our support team for assistance. We may be able to help with troubleshooting or connect you with repair services. Extended warranty plans can be purchased to cover products beyond the standard warranty period.',
      },
      {
        question: 'Are extended warranties worth it?',
        answer:
          "Extended warranties can provide peace of mind and additional coverage beyond the manufacturer warranty. They're particularly valuable for expensive electronics that may be costly to repair. Consider your usage, the product's reliability, and your comfort level with potential repair costs when deciding.",
      },
    ],
  },
  {
    title: 'Promotions & Discounts',
    items: [
      {
        question: 'Do you offer discounts or promotions?',
        answer:
          'Yes, we regularly offer promotions, discounts, and special deals. Sign up for our newsletter to receive exclusive offers, or check our website for current promotions. We also offer student discounts, military discounts, and seasonal sales throughout the year.',
      },
      {
        question: 'How do I use a promo code or coupon?',
        answer:
          'During checkout, you\'ll see a field to enter a promo code or coupon. Enter your code and click "Apply" to see the discount reflected in your order total. Promo codes are case-sensitive and may have expiration dates or minimum purchase requirements.',
      },
      {
        question: 'Do you have a loyalty or rewards program?',
        answer:
          "Yes, we offer a rewards program where you earn points for every purchase. Points can be redeemed for discounts on future orders. You'll automatically be enrolled when you create an account. Check your account dashboard to see your current points balance and available rewards.",
      },
      {
        question: 'Can I combine multiple discounts?',
        answer:
          'Generally, only one discount code can be applied per order. However, some promotions may stack with other offers. The checkout system will automatically apply the best available discount. If you have questions about combining offers, contact customer support.',
      },
      {
        question: 'Do you offer price matching?',
        answer:
          "Yes, we offer price matching on identical products sold by authorized retailers. If you find a lower price within 30 days of purchase, contact our support team with the competitor's listing, and we'll match the price or refund the difference.",
      },
    ],
  },
  {
    title: 'Gift Cards & Gift Orders',
    items: [
      {
        question: 'Do you sell gift cards?',
        answer:
          'Yes, we offer digital and physical gift cards in various denominations. Gift cards never expire and can be used for any purchase on our website. They make perfect gifts for birthdays, holidays, or any occasion.',
      },
      {
        question: 'Can I send a product as a gift?',
        answer:
          'Yes, during checkout you can select "This is a gift" and provide the recipient\'s address. We can include a gift message with your order. Gift receipts are automatically included so the recipient can return or exchange items if needed.',
      },
      {
        question: 'How do I redeem a gift card?',
        answer:
          "During checkout, enter your gift card code in the payment section. The gift card balance will be applied to your order. If the gift card doesn't cover the full amount, you can pay the remainder with another payment method. If it covers more than the order total, the remaining balance stays on the card.",
      },
      {
        question: 'Can I check my gift card balance?',
        answer:
          "Yes, you can check your gift card balance by entering the gift card code in the checkout page or by contacting customer support. We'll provide you with the current balance and expiration date (if applicable).",
      },
    ],
  },
]

function FAQItemComponent({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold pr-8">{item.question}</CardTitle>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent
        isOpen={isOpen}
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 h-0 opacity-0'
        }`}
      >
        <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
      </CardContent>
    </Card>
  )
}

export default function FAQPage() {
  const [cartItemCount, setCartItemCount] = useState(0)

  useEffect(() => {
    cartService.getCartSummary().then((summary) => {
      setCartItemCount(summary.totalItems)
    })
  }, [])

  return (
    <PageLayout cartItemCount={cartItemCount}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Find answers to common questions about shopping at ElectroStore. Can't find what you're looking for?{' '}
            <a href="mailto:support@electrostore.com" className="text-primary-600 hover:underline">
              Contact our support team
            </a>
            .
          </p>
        </div>

        <div className="space-y-12">
          {faqSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h2 className="text-2xl font-semibold mb-6 text-primary-700">{section.title}</h2>
              <div>
                {section.items.map((item, itemIndex) => (
                  <FAQItemComponent key={itemIndex} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">
            Our customer support team is here to help. Reach out to us through any of these channels:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:support@electrostore.com" className="text-primary-600 hover:underline">
                support@electrostore.com
              </a>
            </li>
            <li>
              <strong>Phone:</strong>{' '}
              <a href="tel:18003532787" className="text-primary-600 hover:underline">
                1-800-ELECTRO (1-800-353-2787)
              </a>
            </li>
            <li>
              <strong>Hours:</strong> Monday - Friday, 9 AM - 6 PM EST
            </li>
          </ul>
        </div>
      </div>
    </PageLayout>
  )
}
