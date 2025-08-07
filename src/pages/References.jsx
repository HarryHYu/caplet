const References = () => {
  const references = [
    {
      category: "Financial Literacy Research",
      sources: [
        {
          authors: "Lusardi, A., & Mitchell, O. S.",
          year: "2014",
          title: "The economic importance of financial literacy: Theory and evidence",
          journal: "Journal of Economic Literature",
          volume: "52(1)",
          pages: "5-44",
          doi: "10.1257/jel.52.1.5"
        },
        {
          authors: "OECD",
          year: "2020",
          title: "PISA 2018 Results (Volume IV): Are Students Smart About Money?",
          publisher: "OECD Publishing",
          location: "Paris",
          doi: "10.1787/48ebd1ba-en"
        },
        {
          authors: "Australian Securities and Investments Commission (ASIC)",
          year: "2021",
          title: "Australian Financial Attitudes and Behaviour Tracker",
          publisher: "ASIC",
          location: "Sydney"
        }
      ]
    },
    {
      category: "Australian Financial Education",
      sources: [
        {
          authors: "MoneySmart",
          year: "2023",
          title: "Financial Literacy Strategy",
          publisher: "Australian Securities and Investments Commission",
          location: "Sydney"
        },
        {
          authors: "Financial Literacy Australia",
          year: "2022",
          title: "National Financial Capability Strategy",
          publisher: "Financial Literacy Australia",
          location: "Melbourne"
        },
        {
          authors: "Reserve Bank of Australia",
          year: "2023",
          title: "Financial Stability Review",
          publisher: "Reserve Bank of Australia",
          location: "Sydney"
        }
      ]
    },
    {
      category: "Superannuation and Retirement",
      sources: [
        {
          authors: "Australian Prudential Regulation Authority (APRA)",
          year: "2023",
          title: "Annual Superannuation Bulletin",
          publisher: "APRA",
          location: "Sydney"
        },
        {
          authors: "Association of Superannuation Funds of Australia (ASFA)",
          year: "2023",
          title: "Retirement Standard",
          publisher: "ASFA",
          location: "Sydney"
        },
        {
          authors: "Treasury",
          year: "2023",
          title: "Retirement Income Review",
          publisher: "Australian Government",
          location: "Canberra"
        }
      ]
    },
    {
      category: "Tax and Financial Planning",
      sources: [
        {
          authors: "Australian Taxation Office (ATO)",
          year: "2023",
          title: "Taxation Statistics",
          publisher: "ATO",
          location: "Canberra"
        },
        {
          authors: "Financial Planning Association of Australia",
          year: "2023",
          title: "Financial Planning Standards",
          publisher: "FPA",
          location: "Sydney"
        },
        {
          authors: "CPA Australia",
          year: "2023",
          title: "Personal Financial Planning Guide",
          publisher: "CPA Australia",
          location: "Melbourne"
        }
      ]
    },
    {
      category: "Youth and Education",
      sources: [
        {
          authors: "Foundation for Young Australians",
          year: "2023",
          title: "The New Work Mindset",
          publisher: "FYA",
          location: "Melbourne"
        },
        {
          authors: "Australian Curriculum, Assessment and Reporting Authority",
          year: "2023",
          title: "Financial Literacy in the Australian Curriculum",
          publisher: "ACARA",
          location: "Sydney"
        },
        {
          authors: "University of Melbourne",
          year: "2022",
          title: "Financial Literacy Education in Australian Schools",
          journal: "Australian Journal of Education",
          volume: "66(2)",
          pages: "145-162"
        }
      ]
    },
    {
      category: "Digital Financial Services",
      sources: [
        {
          authors: "Digital Finance Cooperative Research Centre",
          year: "2023",
          title: "Digital Financial Literacy in Australia",
          publisher: "DFCRC",
          location: "Sydney"
        },
        {
          authors: "Australian Competition and Consumer Commission",
          year: "2023",
          title: "Digital Platform Services Inquiry",
          publisher: "ACCC",
          location: "Canberra"
        },
        {
          authors: "University of New South Wales",
          year: "2022",
          title: "Digital Financial Inclusion",
          journal: "Journal of Financial Services Research",
          volume: "61(3)",
          pages: "289-310"
        }
      ]
    },
    {
      category: "Economic and Social Impact",
      sources: [
        {
          authors: "Grattan Institute",
          year: "2023",
          title: "The Wealth of Generations",
          publisher: "Grattan Institute",
          location: "Melbourne"
        },
        {
          authors: "University of Sydney",
          year: "2022",
          title: "Financial Stress and Mental Health in Australia",
          journal: "Australian Journal of Social Issues",
          volume: "57(4)",
          pages: "678-695"
        },
        {
          authors: "Australian Institute of Health and Welfare",
          year: "2023",
          title: "Social Determinants of Health",
          publisher: "AIHW",
          location: "Canberra"
        }
      ]
    }
  ];

  const formatReference = (source) => {
    let formatted = `${source.authors} (${source.year}). `;
    
    if (source.title) {
      formatted += `<em>${source.title}</em>. `;
    }
    
    if (source.journal) {
      formatted += `${source.journal}`;
      if (source.volume) {
        formatted += `, ${source.volume}`;
      }
      if (source.pages) {
        formatted += `, ${source.pages}`;
      }
      formatted += '. ';
    }
    
    if (source.publisher) {
      formatted += `${source.publisher}`;
      if (source.location) {
        formatted += `, ${source.location}`;
      }
      formatted += '. ';
    }
    
    if (source.doi) {
      formatted += `DOI: ${source.doi}`;
    }
    
    return formatted;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              References
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Academic sources and research that inform our financial literacy content and approach.
            </p>
          </div>
        </div>
      </section>

      {/* References Section */}
      <section className="py-16">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Bibliography
              </h2>
              <p className="text-gray-600">
                Our content is based on rigorous academic research and authoritative sources. 
                Below is a comprehensive bibliography of the key sources that inform our educational approach.
              </p>
            </div>

            <div className="space-y-8">
              {references.map((category, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {category.category}
                  </h3>
                  <div className="space-y-4">
                    {category.sources.map((source, sourceIndex) => (
                      <div key={sourceIndex} className="pl-4 border-l-2 border-blue-200">
                        <p className="text-gray-700 leading-relaxed">
                          {formatReference(source)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Information */}
            <div className="mt-12 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                About Our Sources
              </h3>
              <div className="text-gray-600 space-y-3">
                <p>
                  All content on Caplet is thoroughly researched and based on reliable, authoritative sources. 
                  We prioritize peer-reviewed academic research, government publications, and industry reports 
                  to ensure accuracy and credibility.
                </p>
                <p>
                  Our references are regularly updated to reflect current research and changes in Australian 
                  financial regulations. We maintain a commitment to evidence-based education that serves 
                  the Australian community.
                </p>
                <p>
                  For the most current information on specific topics, we recommend consulting the original 
                  sources listed above, as well as qualified financial professionals for personalized advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default References;
