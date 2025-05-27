
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export function MapComponent({ data }: any) {
    return (
        <div className="mt-10 w-full" style={{ height: "500px" }}>
            <MapContainer
                center={[data.location.latitude, data.location.longitude]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[data.location.latitude, data.location.longitude]}>
                    <Popup>
                        You are here:<br />
                        {data.location.city}, {data.location.country}
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    )
}