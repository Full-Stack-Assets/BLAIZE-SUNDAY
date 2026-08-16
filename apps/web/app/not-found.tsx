import Link from "next/link";

import { Shell } from "../components/Shell";

export default function NotFound() {
  return <Shell><div className="card empty"><p className="eyebrow">404 / signal missing</p><h1>That Songforge record was not found.</h1><Link className="button" href="/">Return home</Link></div></Shell>;
}
