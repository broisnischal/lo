import { useEffect } from "react";
import { useState } from "react";
import type { Route } from "./+types/home";

export async function loader() {
  // const response = await fetch("http://localhost:3000/user-info", {
  //   method: "POST",
  //   body: JSON.stringify({
  //     lat: 12.9716,
  //     long: 77.5946
  //   })
  // });
  // const data = await response.json();
  return {
    data: {
      test: "asdf"
    }
  };
}

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Location Application" },
    { name: "description", content: "Welcome to Location Application!" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(loaderData)

  useEffect(() => {
    // Helper to actually POST to your API
    function fetchUserInfo(body: any) {
      fetch('/api/user-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText)
          return res.json()
        })
        .then((json) => {
          setData(json.data)
        })
        .catch((err) => {
          console.error(err)
          setError(err.message)
        })
        .finally(() => {
          setLoading(false)
        })
    }

    if (!navigator.geolocation) {
      // browser doesn’t support geo → fallback
      fetchUserInfo({})
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchUserInfo({
            lat: pos.coords.latitude,
            long: pos.coords.longitude,
          })
        },
        (geoErr) => {
          console.warn('Geolocation error', geoErr)
          // user denied or error → fallback
          fetchUserInfo({})
        }
      )
    }
  }, [])

  if (loading) return <div className="p-20">Loading…</div>
  if (error)
    return (
      <div className="p-20">
        <p>Error: {error}</p>
      </div>
    )




  return (

    <div className="p-20">
      <div className="flex flex-col items-center justify-center ">
        <h1 className="text-4xl font-bold">Welcome to the Location Application</h1>
        <p className="text-lg">This is the home page of the app.</p>
      </div>

      <pre>{JSON.stringify(loaderData, null, 2)}</pre>

      <pre className="mt-8">{JSON.stringify(data, null, 2)}</pre>

    </div>
  );
}
