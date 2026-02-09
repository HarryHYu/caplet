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
      answer: "Financial literacy is understanding how money works. It helps you make better decisions, avoid debt, plan for retirement, and protect yourself from scams. Many Australians lack these skills, leading to poor financial outcomes."
    },
    {
      question: "Is CapletEdu free to use?",
      answer: "Yes. CapletEdu currently provides free educational services. All courses, lessons, and tools are accessible at no cost. Future development may include SaaS offerings for schools and large institutions."
    },
    {
      question: "What topics does CapletEdu cover?",
      answer: "CapletEdu covers financial fundamentals tailored to Australian students: budgeting, tax, superannuation, investing basics, and business finance. All content is structured with Australian context and designed for integration into school curricula."
    },
    {
      question: "How is CapletEdu different from other financial education platforms?",
      answer: "CapletEdu is specifically designed for institutional integration into school curricula. We work directly with educators to develop structured lessons tailored to Australian students. Currently integrated into Knox Grammar School Commerce Department and used by Capital Finance Club, with coursework designed in collaboration with school staff."
    },
    {
      question: "Do I need any prior financial knowledge to use Caplet?",
      answer: "No. We start with the basics and build up. Designed for everyone, from complete beginners to those with experience."
    },
    {
      question: "How often is the content updated?",
      answer: "We regularly update content to reflect current Australian financial regulations, market conditions, and best practices. Content is reviewed and updated quarterly."
    },
    {
      question: "Can I trust the information on Caplet?",
      answer: "Yes. All content is thoroughly researched from reliable sources including Australian government resources, financial regulatory bodies, and academic research. We recommend consulting qualified professionals for personalized advice."
    },
    {
      question: "Is CapletEdu suitable for schools and institutions?",
      answer: "Yes. CapletEdu is specifically designed for high school students and institutional use. We're currently integrated into Knox Grammar School Commerce Department for Years 9–10, serving approximately 400 students. Coursework is designed in collaboration with school staff, and we have plans to expand to other schools."
    },
    {
      question: "What about older Australians and retirees?",
      answer: "Yes. We cover retirement planning, superannuation, managing retirement income, estate planning, and protecting yourself from financial scams. Clear, accessible language for all ages."
    },
    {
      question: "How can I get help if I have questions about the content?",
      answer: "We provide self-directed learning. For general inquiries, contact us. For personalized financial advice, consult qualified professionals like financial advisors, accountants, or financial counselors."
    },
    {
      question: "What are CapletEdu's expansion plans?",
      answer: "After establishing CapletEdu within the Knox Commerce Department, we plan to expand to other schools and potentially into preparatory school settings to provide opportunities for younger students. Future development may include SaaS offerings for schools and large institutions."
    },
    {
      question: "How can schools or institutions integrate CapletEdu?",
      answer: "Schools and institutions interested in integrating CapletEdu into their curriculum can contact us to discuss partnership opportunities. We work collaboratively with educators to design coursework that fits their specific needs and Australian educational standards."
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
              Common questions about Caplet and financial education.
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
                Can't find what you're looking for? Reach out to us.
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
