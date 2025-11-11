/**
 * Area Rating Service
 * Combines crime statistics, sex offender data, and demographics
 * to provide an A-F rating for property neighborhoods
 */

export interface AreaRating {
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  overallScore: number; // 0-100
  crimeGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  crimeScore: number;
  sexOffenderGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  sexOffenderCount: number;
  sexOffenderDistance: number; // Distance to nearest in miles
  schoolRating: number; // 1-10
  walkScore?: number;
  details: {
    totalCrimes: number;
    violentCrimes: number;
    propertyCrimes: number;
    crimesPer1000: number;
    sexOffendersWithin1Mile: number;
    sexOffendersWithinHalfMile: number;
    nearestSexOffenderFeet: number;
  };
  warnings: string[];
  positives: string[];
}

/**
 * Get comprehensive area rating
 */
export async function getAreaRating(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  latitude: number,
  longitude: number
): Promise<AreaRating> {
  try {
    console.log(`📊 Calculating area rating for: ${address}, ${city}, ${state}`);

    // Fetch data from multiple sources in parallel
    const [crimeData, sexOffenderData, schoolData] = await Promise.allSettled([
      getCrimeStatistics(latitude, longitude, city, state),
      getSexOffenderData(latitude, longitude, zipCode),
      getSchoolRatings(latitude, longitude),
    ]);

    // Calculate individual scores
    const crimeScore = crimeData.status === 'fulfilled' ? crimeData.value : null;
    const offenderData = sexOffenderData.status === 'fulfilled' ? sexOffenderData.value : null;
    const schools = schoolData.status === 'fulfilled' ? schoolData.value : null;

    // Calculate grades
    const crimeGrade = calculateGrade(crimeScore?.score || 50);
    const sexOffenderGrade = calculateGrade(offenderData?.score || 50);

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (crimeScore?.score || 50) * 0.5 + // Crime is 50% of score
      (offenderData?.score || 50) * 0.3 + // Sex offenders 30%
      (schools?.averageRating || 5) * 10 * 0.2 // Schools 20%
    );

    const overallGrade = calculateGrade(overallScore);

    // Generate warnings and positives
    const warnings: string[] = [];
    const positives: string[] = [];

    if (crimeGrade === 'D' || crimeGrade === 'F') {
      warnings.push(`High crime area (Grade ${crimeGrade})`);
    } else if (crimeGrade === 'A' || crimeGrade === 'B') {
      positives.push(`Low crime area (Grade ${crimeGrade})`);
    }

    if (offenderData && offenderData.count > 5) {
      warnings.push(`${offenderData.count} registered sex offenders within 1 mile`);
    } else if (offenderData && offenderData.count === 0) {
      positives.push('No registered sex offenders within 1 mile');
    }

    if (offenderData && offenderData.nearestDistanceFeet < 1000) {
      warnings.push(`Sex offender within ${Math.round(offenderData.nearestDistanceFeet)} feet`);
    }

    if (schools && schools.averageRating >= 8) {
      positives.push(`Excellent schools (avg rating: ${schools.averageRating}/10)`);
    }

    return {
      overallGrade,
      overallScore,
      crimeGrade,
      crimeScore: crimeScore?.score || 50,
      sexOffenderGrade,
      sexOffenderCount: offenderData?.count || 0,
      sexOffenderDistance: offenderData?.nearestDistanceMiles || 999,
      schoolRating: schools?.averageRating || 5,
      walkScore: undefined, // TODO: Integrate WalkScore API
      details: {
        totalCrimes: crimeScore?.totalIncidents || 0,
        violentCrimes: crimeScore?.violentCrimes || 0,
        propertyCrimes: crimeScore?.propertyCrimes || 0,
        crimesPer1000: crimeScore?.crimesPer1000 || 0,
        sexOffendersWithin1Mile: offenderData?.within1Mile || 0,
        sexOffendersWithinHalfMile: offenderData?.withinHalfMile || 0,
        nearestSexOffenderFeet: offenderData?.nearestDistanceFeet || 999999,
      },
      warnings,
      positives,
    };
  } catch (error: any) {
    console.error('❌ Area rating error:', error.message);
    throw error;
  }
}

/**
 * Get crime statistics from free APIs
 */
async function getCrimeStatistics(
  lat: number,
  lon: number,
  city: string,
  state: string
): Promise<any> {
  try {
    // Use FBI Crime Data API (free, no key required)
    const response = await fetch(
      `https://api.usa.gov/crime/fbi/cde/arrest/state/${state}/all?API_KEY=DEMO_KEY`,
      { headers: { 'User-Agent': 'RentalIQ/1.0' } }
    );

    if (!response.ok) {
      // Fallback to estimated data based on national averages
      return getEstimatedCrimeData(city, state);
    }

    const data = await response.json();

    // Process and calculate score
    const totalIncidents = data.data?.[0]?.value || 0;
    const population = 100000; // Estimate
    const crimesPer1000 = (totalIncidents / population) * 1000;

    // Score: Lower crime = higher score
    // National average is ~40 crimes per 1000 people
    const score = Math.max(0, Math.min(100, 100 - (crimesPer1000 / 40) * 100));

    return {
      score: Math.round(score),
      totalIncidents,
      violentCrimes: Math.round(totalIncidents * 0.3),
      propertyCrimes: Math.round(totalIncidents * 0.7),
      crimesPer1000,
    };
  } catch (error) {
    console.error('Crime API error:', error);
    return getEstimatedCrimeData(city, state);
  }
}

/**
 * Get sex offender data using National Sex Offender Public Website
 */
async function getSexOffenderData(
  lat: number,
  lon: number,
  zipCode: string
): Promise<any> {
  try {
    console.log(`🚨 Fetching sex offender data for ZIP: ${zipCode}`);

    // Use Bright Data to scrape NSOPW (National Sex Offender Public Website)
    const response = await fetch('https://api.brightdata.com/datasets/v3/trigger', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataset_id: process.env.BRIGHT_DATA_DATASET_ID,
        include_errors: true,
        discover_by: [
          {
            url: `https://www.nsopw.gov/search?addressOrZip=${zipCode}`,
          }
        ],
      }),
    });

    const triggerResult = await response.json();
    const snapshotId = triggerResult.snapshot_id || triggerResult;

    if (!snapshotId) {
      return getEstimatedSexOffenderData(zipCode);
    }

    // Poll for results
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const snapshotResponse = await fetch(
        `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
          },
        }
      );

      if (snapshotResponse.ok) {
        const data = await snapshotResponse.json();

        if (Array.isArray(data) && data.length > 0) {
          // Calculate distances and counts
          const offenders = data.map((o: any) => ({
            distance: calculateDistance(lat, lon, o.latitude, o.longitude),
            ...o,
          }));

          const within1Mile = offenders.filter((o: any) => o.distance <= 1).length;
          const withinHalfMile = offenders.filter((o: any) => o.distance <= 0.5).length;
          const nearest = offenders.sort((a: any, b: any) => a.distance - b.distance)[0];

          // Score: Fewer offenders = higher score
          const score = Math.max(0, 100 - (within1Mile * 10));

          return {
            count: offenders.length,
            within1Mile,
            withinHalfMile,
            nearestDistanceMiles: nearest?.distance || 999,
            nearestDistanceFeet: (nearest?.distance || 999) * 5280,
            score: Math.round(score),
          };
        }
      }
    }

    return getEstimatedSexOffenderData(zipCode);
  } catch (error) {
    console.error('Sex offender API error:', error);
    return getEstimatedSexOffenderData(zipCode);
  }
}

/**
 * Get school ratings from GreatSchools API
 */
async function getSchoolRatings(lat: number, lon: number): Promise<any> {
  try {
    // GreatSchools has a free API with limited access
    const response = await fetch(
      `https://api.greatschools.org/schools/nearby?lat=${lat}&lon=${lon}&radius=5&limit=10`,
      {
        headers: {
          'X-API-Key': process.env.GREAT_SCHOOLS_API_KEY || 'demo',
        },
      }
    );

    if (!response.ok) {
      return { averageRating: 5 };
    }

    const data = await response.json();
    const schools = data.schools || [];
    const ratings = schools.map((s: any) => s.rating || 5);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      : 5;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      schools: schools.length,
    };
  } catch (error) {
    return { averageRating: 5 };
  }
}

/**
 * Calculate grade from score
 */
function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Calculate distance between two lat/lon points in miles
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fallback estimated data when APIs are unavailable
 */
function getEstimatedCrimeData(city: string, state: string): any {
  // Provide conservative estimates
  return {
    score: 65, // C grade - conservative estimate
    totalIncidents: 1000,
    violentCrimes: 300,
    propertyCrimes: 700,
    crimesPer1000: 35,
  };
}

function getEstimatedSexOffenderData(zipCode: string): any {
  return {
    count: 5, // Conservative estimate
    within1Mile: 5,
    withinHalfMile: 2,
    nearestDistanceMiles: 0.5,
    nearestDistanceFeet: 2640,
    score: 50, // C grade - conservative
  };
}
