export default function Loading() {
  console.log("burası çalıştı");

  // Basit bir yükleme animasyonu
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-emerald-500"></div>
    </div>
  );
}
