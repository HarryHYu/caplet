import { useState } from 'react';

const FAQ = () => {
  const [openItems, setOpenItems] = useState(new Set());

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqData = [
    {
      question: "What is financial literacy and why is it important?",
      answer: "Financial literacy is the ability to understand and use various financial skills, including personal financial management, budgeting, and investing. It's crucial because it helps you make informed decisions about your money, avoid debt, plan for retirement, and protect yourself from financial scams. In Australia, many people lack these essential skills, which can lead to poor financial outcomes."
    },
    {
      question: "Is Caplet really free to use?",
      answer: "Yes, Caplet is completely free to use. We believe that financial education should be accessible to everyone, regardless of their financial situation. All our educational content, resources, and tools are available at no cost. Our mission is to bridge the financial literacy gap in Australia, and we're committed to keeping our platform free and accessible."
    },
    {
      question: "What topics does Caplet cover?",
      answer: "Caplet covers everything money-related with an Australian focus, including: trading strategies and day trading, investing and portfolio management, budgeting and money management, superannuation and retirement planning, tax basics and obligations, loans and credit management, economics and business finance, insurance and risk management, and financial goal setting. We provide comprehensive coverage of all financial topics while maintaining strong relevance to Australian markets, regulations, and financial systems."
    },
    {
      question: "How is Caplet different from other financial education platforms?",
      answer: "Caplet provides comprehensive coverage of all money-related topics - from trading to tax - while maintaining a strong Australian focus. Unlike generic platforms, we ensure all content is relevant to Australian markets, regulations, and financial systems. Our content is evidence-based, practical, and accessible to all ages and backgrounds. We prioritize simplicity and clarity, making complex financial concepts easy to understand, whether you're learning day trading strategies or retirement planning."
    },
    {
      question: "Do I need any prior financial knowledge to use Caplet?",
      answer: "No, you don't need any prior financial knowledge to use Caplet. Our platform is designed to be accessible to everyone, from complete beginners to those with some financial experience. We start with the basics and gradually build up to more complex topics. Our content is structured to be easy to follow and understand."
    },
    {
      question: "How often is the content updated?",
      answer: "We regularly update our content to reflect current Australian financial regulations, market conditions, and best practices. Our team monitors changes in financial laws, superannuation rules, tax regulations, and other relevant updates to ensure our information remains accurate and current. We typically review and update content quarterly."
    },
    {
      question: "Can I trust the information on Caplet?",
      answer: "Yes, you can trust our information. All our content is thoroughly researched and based on reliable sources, including Australian government resources, financial regulatory bodies, and academic research. We cite our sources and provide references for further reading. However, we always recommend consulting with qualified financial professionals for personalized advice."
    },
    {
      question: "Is Caplet suitable for young people and students?",
      answer: "Absolutely! Caplet is designed to be accessible to people of all ages, including young people and students. We have specific content tailored to common financial challenges faced by young Australians, such as managing student loans, understanding superannuation from your first job, budgeting on a limited income, and building good financial habits early."
    },
    {
      question: "What about older Australians and retirees?",
      answer: "Caplet is also designed for older Australians and retirees. We cover topics like retirement planning, understanding your superannuation, managing retirement income, estate planning, and protecting yourself from financial scams that often target older Australians. Our content is written in clear, accessible language suitable for all age groups."
    },
    {
      question: "How can I get help if I have questions about the content?",
      answer: "Currently, Caplet provides self-directed learning through our educational content. While we don't offer personalized financial advice, we do provide contact information for general inquiries. For specific financial advice, we recommend consulting with qualified financial professionals, such as financial advisors, accountants, or financial counselors."
    },
    {
      question: "Will Caplet add more features in the future?",
      answer: "Yes, we have plans to expand Caplet with additional features including AI-powered financial consulting, mentorship programs, interactive learning tools, and more personalized content. Our goal is to continuously improve and expand our platform to better serve the Australian community's financial education needs."
    },
    {
      question: "How can I support Caplet's mission?",
      answer: "You can support Caplet by using our platform, sharing it with friends and family, providing feedback on our content, and spreading awareness about the importance of financial literacy. We're committed to keeping our platform free, so the best way to support us is to help us reach more Australians who could benefit from financial education."
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Find answers to common questions about financial literacy and the Caplet platform.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {faqData.map((item, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button
                    className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 bg-white dark:bg-gray-800"
                    onClick={() => toggleItem(index)}
                  >
                    <span className="font-semibold text-gray-900 dark:text-white pr-4">
                      {item.question}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                        openItems.has(index) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openItems.has(index) && (
                    <div className="px-6 pb-4">
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Contact CTA */}
            <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 p-8 rounded-lg text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Still have questions?
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                If you couldn't find the answer you're looking for, feel free to reach out to us.
              </p>
              <a
                href="mailto:contact@capletedu.org"
                className="btn-primary inline-block"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
