const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Terms and Services
          </h1>
          
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Caplet is not liable for any financial damages.
            </p>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Caplet is designed purely for educational purposes and should not be construed as robust financial advice.
            </p>
            
            <p className="text-gray-700 dark:text-gray-300">
              Don't sue us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;

