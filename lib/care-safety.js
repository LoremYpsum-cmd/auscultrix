/**
 * Clinical content-safety gate for the comforting media (books, films,
 * series, documentaries, podcasts, games).
 *
 * DEFAULT DENY: an item can be offered only if it is in APPROVED_CARE_ITEMS,
 * reviewed title by title against the criteria below. Anything else —
 * including the 726 director filmographies and any title added later without
 * review — is never offered. Every curated title that did not pass is listed
 * in EXCLUDED_CARE_ITEMS with its reasons, so the review can be audited and
 * re-done by clinicians (docs/scientifico/media-sicurezza-clinica.md).
 *
 * Criteria (exclusion when any applies):
 *  - suicide     suicide, a suicide attempt or self-harm depicted, or central
 *                to the plot. Media portrayals are associated with imitation
 *                (Niederkrotenthaler et al., 2010; 2019; Bridge et al., 2020)
 *                and WHO media guidance asks to avoid them. Recovery stories
 *                can be protective ("Papageno effect"), but an automated tool
 *                that cannot know who is reading does not offer them.
 *  - sexual_violence, child_harm (abuse, or death of a child),
 *    graphic_violence (crime, war, gore), atrocity (genocide, Holocaust,
 *    war crimes), horror, substance (addiction depicted), eating_disorder
 *  - heavy_theme death of a loved one, terminal illness or a psychiatric
 *                ward as the main subject, without the gentleness of comfort
 *  - mature      adult rating or sexual content
 *  - low_valence the work's overall tone is not comforting (valence < 0.5)
 *  - off_purpose not comfort media (director monographs, film criticism,
 *                true crime, politics)
 *
 * A gentle grief theme (for instance Up, Coco, Kitchen) is allowed with a
 * content note, but it is not offered when the person's valence is very low
 * or during a crisis: sad content can deepen rumination (Garrido & Schubert,
 * 2015). During a crisis only gentle, low-energy items are offered.
 *
 * This is a conservative editorial screen, not a clinical validation: it is
 * meant to be reviewed and signed off by clinicians (study V-5).
 */

export const CARE_SAFETY_VERSION = 'care-safety-1.0 (reviewed 2026-11-23)';

export const EXCLUSION_CRITERIA = Object.freeze([
  'suicide', 'sexual_violence', 'child_harm', 'graphic_violence', 'atrocity', 'horror',
  'substance', 'eating_disorder', 'heavy_theme', 'mature', 'low_valence', 'off_purpose',
]);

/** Items reviewed and approved. `grief` = gentle grief theme (content note). */
const G = { grief: true };
export const APPROVED_CARE_ITEMS = Object.freeze({
  // books
  book_wherever_you_go: {}, book_boy_mole_fox_horse: {}, book_atomic_habits: {}, book_ikigai: {},
  book_when_things_fall_apart: {}, book_the_comfort_book: {}, book_flow: {}, book_big_magic: {},
  book_untethered_soul: {}, book_musicophilia: {}, book_rest: {}, book_little_prince: G,
  book_maybe_you_should_talk: G, book_siddhartha: {}, book_arte_essere_fragili: {}, book_otto_montagne: G,
  book_marcovaldo: {}, book_bar_sotto_mare: {}, book_pride_prejudice: {}, book_persuasion: {},
  book_little_women: G, book_anne_green_gables: G, book_secret_garden: {}, book_winnie_pooh: {},
  book_hobbit: {}, book_momo: {}, book_neverending_story: {}, book_favole_telefono: {},
  book_barone_rampante: {}, book_uomo_pianta_alberi: {}, book_profeta: {}, book_walden: {},
  book_kitchen: G, book_visconte_dimezzato: {}, book_alchimista: {}, book_devotions: {},
  book_odi_elementari: {}, book_lettere_giovane_poeta: {}, book_foglie_erba: {}, book_comfort_book: {},
  book_miracolo_presenza: {}, book_barone_lamberto: {}, book_rose_insalata: {}, book_mostri_selvaggi: {},
  book_albero_shel: {}, book_aff_paterson_wcw: {}, book_aff_kiffe_kiffe: {}, book_aff_catching_fish: {},
  // films
  film_inside_out: {}, film_totoro: {}, film_kikis_delivery: {}, film_secret_life_walter_mitty: {},
  film_soul: G, film_paddington2: {}, film_intouchables: {}, film_wall_e: {}, film_about_time: G,
  film_hunt_wilderpeople: G, film_departures: G, film_sing_street: {}, film_cinema_paradiso: G,
  film_perfetti_sconosciuti: {}, film_pane_tulipani: {}, film_mediterraneo: {}, film_il_postino: G,
  film_gold_rush: {}, film_the_kid: {}, film_safety_last: {}, film_the_general: {}, film_circus: {},
  film_charade: {}, film_trip_moon: {}, film_steamboat_bill: {}, film_his_girl_friday: {},
  film_pianista_oceano: G, film_non_ci_resta: {}, film_ricomincio_da_tre: {}, film_johnny_stecchino: {},
  film_caro_diario: {}, film_big_fish: G, film_truman_show: {}, film_little_women_2019: G,
  film_pride_prejudice: {}, film_notting_hill: {}, film_love_actually: {}, film_holiday: {},
  film_singin_rain: {}, film_hugo: {}, film_ratatouille: {}, film_up: G, film_coco: G,
  film_paddington: {}, film_wonka: {}, film_showman: {},
  // series
  tv_schitts_creek: {}, tv_the_good_place: {}, tv_midnight_diner: {}, tv_queer_eye: {},
  tv_parks_and_rec: {}, tv_our_planet: {}, tv_chefstable: {}, tv_gilmore_girls: {},
  tv_all_creatures: {}, tv_detectorists: {}, tv_trying: {}, tv_durrells: {}, tv_doc_martin: {},
  tv_derry_girls: {}, tv_somebody_somewhere: G, tv_woo: {}, tv_chachacha: {}, tv_reply_1988: G,
  tv_boris: {}, tv_aff_blossoms: {}, tv_aff_curb: {}, tv_aff_dix_pour_cent: {}, tv_aff_taco_chronicles: {},
  // documentaries and podcasts
  doc_octopus_teacher: {}, doc_neighbor: {}, doc_fantastic_fungi: {}, pod_happiness_lab: {},
  pod_on_being: {}, pod_nothing_much: {}, doc_sacro_gra: {}, pod_morgana: {}, pod_ci_vuole_scienza: {},
  pod_storielibere: {}, doc_nanook: {}, doc_man_movie_camera: {}, doc_berlin_symphony: {},
  doc_moana_1926: {}, doc_microcosmos: {}, doc_peuple_migrateur: {}, doc_jiro_sushi: {},
  doc_man_on_wire: {}, doc_pina: {}, doc_cave_dreams: {}, doc_honeyland: {}, doc_gleaners: {},
  doc_faces_places: {}, pod_sleep_with_me: {}, pod_get_sleepy: {}, pod_everything_alive: {},
  pod_heavyweight: {}, pod_song_exploder: {}, pod_desert_island: {}, pod_99pi: {}, pod_allusionist: {},
  pod_scientificast: {}, pod_aff_afropop: {}, pod_aff_soul_music: G, doc_aff_calle_54: {},
  doc_aff_kingdom_dreams: {}, doc_aff_sketches_gehry: {}, doc_aff_buena_vista: {},
  // games
  game_cave_story: {}, game_deltarune: {}, game_dr_langeskov: {}, game_the_looker: {}, game_journey: {},
  game_a_short_hike: {}, game_unpacking: {}, game_gris: G, game_spiritfarer: G, game_coffee_talk: {},
  game_jusant: {}, game_cocoon: {}, game_venba: G, game_abzu: {}, game_flower: {}, game_donut_county: {},
  game_chicory: {}, game_toem: {}, game_dordogne: G, game_lil_gator: {}, game_alba: {},
  game_assemble_care: {}, game_monument_valley: {}, game_florence: {}, game_old_mans_journey: G,
  game_behind_frame: {}, game_memoir_blue: {}, game_smushi: {}, game_wattam: {},
  game_aff_costume_quest: {}, game_aff_typerider: {},
  game_aff_mutazione: G, game_aff_last_guardian: {},
});

const OFF = ['off_purpose'];
const VIOL = ['graphic_violence'];
/** Curated titles reviewed and excluded, with reasons (audit trail). */
export const EXCLUDED_CARE_ITEMS = Object.freeze({
  book_man_search_meaning: ['atrocity'], book_reasons_stay_alive: ['suicide'],
  book_midnight_library: ['suicide'], book_body_keeps_score: ['sexual_violence', 'child_harm'],
  book_se_questo_uomo: ['atrocity'], book_casa_sguardi: ['suicide', 'substance'],
  book_deserto_tartari: ['low_valence'], book_luna_falo: ['graphic_violence'],
  book_amica_geniale_romanzo: ['graphic_violence', 'sexual_violence'], book_io_non_ho_paura: ['child_harm'],
  book_fu_mattia_pascal: ['suicide'], book_questione_privata: ['graphic_violence'],
  book_aff_apropos_nothing: OFF, book_aff_almodovar_on: OFF, book_aff_magnifica_ossessione: OFF,
  book_aff_burton_on: OFF, book_aff_lebowski: OFF, book_aff_cronenberg_on: OFF, book_aff_turnaround: OFF,
  book_aff_godard_on: OFF, book_aff_like_water_chocolate: ['mature'], book_aff_drunkard: ['substance'],
  book_aff_boy_kitano: OFF, book_aff_kusturica_memoir: OFF, book_aff_heat2: VIOL,
  book_aff_go_down_together: VIOL, book_aff_roman_polanski: ['off_purpose', 'sexual_violence'],
  book_aff_out_of_africa: OFF, book_aff_scorsese_on: OFF, book_aff_getting_away: OFF,
  book_aff_chasing_light: ['substance', 'graphic_violence'], book_aff_trier_on: OFF,
  book_aff_emotion_pictures: OFF, book_aff_john_woo_interviews: OFF, book_aff_savage_detectives: ['mature'],
  book_aff_unbearable_lightness: ['mature'], book_aff_assommoir: ['substance'],
  film_amelie: ['mature'], film_good_will_hunting: ['child_harm'], film_perks_wallflower: ['suicide', 'sexual_violence'],
  film_little_miss_sunshine: ['suicide'], film_castaway_moon: ['suicide'], film_okuribito_koe: ['suicide'],
  film_vita_e_bella: ['atrocity'], film_stanza_figlio: ['child_harm'], film_sunrise: VIOL,
  film_meet_john_doe: ['suicide'], film_the_crowd: ['child_harm', 'suicide'], film_meglio_gioventu: ['suicide'],
  film_dead_poets: ['suicide'], film_forrest_gump: ['child_harm', 'graphic_violence'], film_groundhog: ['suicide'],
  tv_ted_lasso: ['suicide'], tv_heartstopper: ['eating_disorder', 'suicide'], tv_anne_with_an_e: ['child_harm'],
  tv_the_bear: ['suicide', 'substance'], tv_severance: ['low_valence'], tv_amica_geniale: ['graphic_violence', 'sexual_violence'],
  tv_strappare_lungo_i_bordi: ['suicide'], tv_skam_italia: ['substance', 'sexual_violence'],
  tv_questo_mondo_non_mi_rendera_cattivo: ['substance', 'graphic_violence'], tv_la_linea_verticale: ['heavy_theme'],
  tv_downton_abbey: ['sexual_violence'], tv_call_midwife: ['child_harm', 'heavy_theme'], tv_shrinking: ['heavy_theme'],
  tv_hospital_playlist: ['heavy_theme'], tv_tutto_chiede_salvezza: ['suicide', 'heavy_theme'],
  tv_aff_miami_vice: VIOL, tv_aff_twin_peaks: ['sexual_violence', 'horror'], tv_aff_fargo: VIOL,
  tv_aff_knick: ['substance', 'graphic_violence'], tv_aff_riget: ['horror'], tv_aff_wednesday: VIOL,
  tv_aff_boardwalk: VIOL, tv_aff_deadwood: VIOL, tv_aff_good_wife: ['mature'], tv_aff_antidisturbios: VIOL,
  tv_aff_mille992: VIOL, tv_aff_bureau: VIOL, tv_aff_sanctuary: VIOL, tv_aff_senke_balkan: VIOL,
  tv_aff_casa_flores: ['suicide'], tv_aff_reservation_dogs: ['suicide'], tv_aff_babylon_berlin: ['substance', 'graphic_violence'],
  tv_aff_warrior: VIOL, tv_aff_plot_america: ['atrocity'], tv_aff_burning_bush: ['suicide'], tv_aff_sleepers: VIOL,
  tv_aff_narcos_mexico: ['substance', 'graphic_violence'], tv_aff_en_therapie: ['suicide', 'graphic_violence'],
  doc_fuocoammare: ['heavy_theme'], doc_baraka: ['atrocity'], doc_samsara: ['graphic_violence'],
  doc_koyaanisqatsi: ['heavy_theme'], doc_salt_earth: ['atrocity'], doc_fire_of_love: ['heavy_theme'],
  pod_aff_new_yorker_fiction: ['mature'], pod_aff_radio_ambulante: ['graphic_violence'],
  pod_aff_unspooled: OFF, pod_aff_blank_check: OFF, pod_aff_team_deakins: OFF, pod_aff_evolution_horror: ['horror'],
  pod_aff_secret_history: OFF, pod_aff_filmspotting: OFF, pod_aff_big_picture: OFF, pod_aff_talkhouse: OFF,
  pod_aff_important_cinema: OFF, pod_aff_kiffe_ta_race: OFF, pod_aff_film_comment: OFF,
  pod_aff_twin_peaks_unwrapped: OFF, pod_aff_rewatchables: OFF, pod_aff_ymrt: OFF, pod_aff_plot_thickens: OFF,
  pod_aff_script_apart: OFF, pod_aff_directors_cut: OFF, pod_aff_scriptnotes: OFF, pod_aff_dollop: OFF,
  pod_aff_mubi_podcast: OFF, pod_aff_action_boyz: OFF, doc_aff_woody_doc: OFF, doc_aff_fellini_liar: OFF,
  doc_aff_american_nightmare: ['horror'], doc_aff_easy_riders: ['off_purpose', 'substance'], doc_aff_new_flesh: ['horror'],
  doc_aff_forman_vs: OFF, doc_aff_deux_vague: OFF, doc_aff_chavela: ['substance'], doc_aff_gimme_danger: ['substance'],
  doc_aff_golden_gate: OFF, doc_aff_chronique_ete: OFF, doc_aff_maradona_kusturica: ['substance'],
  doc_aff_lynch_art_life: OFF, doc_aff_enron: OFF, doc_aff_hearts_darkness: OFF,
  doc_aff_wanted_desired: ['sexual_violence'], doc_aff_last_waltz: ['substance'], doc_aff_everything_fine: ['suicide'],
  doc_aff_south_border: OFF, doc_aff_five_obstructions: OFF, doc_aff_iron_fists: VIOL, doc_aff_czech_dream: OFF,
  pod_aff_el_hilo: ['graphic_violence'],
  game_stardew_valley: ['suicide', 'substance'], game_firewatch: ['child_harm'], game_edith_finch: ['suicide', 'child_harm'],
  game_rapture: ['heavy_theme'], game_night_woods: ['graphic_violence', 'heavy_theme'], game_static_speaks: ['suicide'],
  game_aff_jazzpunk: ['mature'], game_aff_rime: ['child_harm'], game_aff_town_of_light: ['sexual_violence', 'suicide'],
  game_aff_kentucky_route: ['heavy_theme'], game_aff_soma: ['horror', 'suicide'], game_aff_gone_home: ['heavy_theme'],
  game_aff_va11halla: ['mature'], game_aff_remember_me: VIOL, game_aff_war_of_mine: ['atrocity'],
  game_aff_deadly_premonition: ['horror'], game_aff_la_noire: VIOL, game_aff_rdr2: ['graphic_violence', 'mature'],
  game_aff_inside_playdead: ['heavy_theme'], game_aff_to_the_moon: ['heavy_theme'], game_aff_mafia_de: VIOL,
  game_aff_monaco: VIOL, game_aff_not_for_broadcast: VIOL, game_aff_papers_please: ['heavy_theme'],
  game_aff_life_is_strange: ['suicide'], game_aff_friend_pedro: VIOL, game_aff_kingdom_come: ['graphic_violence', 'mature'],
  game_aff_mulaka: VIOL, game_aff_bury_me: ['heavy_theme'], game_aff_sleeping_dogs: VIOL,
  // second pass on games (23 Nov 2026)
  game_aff_stanley: ['suicide'], // a self-inflicted fall is one of the endings, played for laughs
  game_the_plan: ['heavy_theme'], // a life's journey toward its end
  game_gorogoa: ['heavy_theme'], // war, ruins and despair in the protagonist's story
});

/** Below this declared valence a grief theme is not offered. */
export const GRIEF_MIN_VALENCE = 0.4;
/** During a crisis only gentle items at or below this energy are offered. */
export const CRISIS_MAX_ENERGY = 0.45;

/**
 * May this item be offered to this person now?
 * @param {object} item catalogue item
 * @param {object} [mood] analysis; `careSafetyLevel` ('none'|'substance'|'crisis');
 *   `declaredValence` is the person's own valence before the panel blends it
 *   with the playlist (the safety rule must use what the person declared)
 * @returns {{ ok: boolean, reason: string }}
 */
export function careItemAllowed(item, mood = {}) {
  const id = String(item?.id || '');
  const approval = APPROVED_CARE_ITEMS[id];
  if (!approval) return { ok: false, reason: EXCLUDED_CARE_ITEMS[id] ? EXCLUDED_CARE_ITEMS[id].join(',') : 'not_reviewed' };
  if (!(Number(item.valence) >= 0.5)) return { ok: false, reason: 'low_valence' };
  const level = mood?.careSafetyLevel || 'none';
  const v = Number(mood?.declaredValence ?? mood?.valence);
  if (approval.grief && (level !== 'none' || (Number.isFinite(v) && v < GRIEF_MIN_VALENCE))) {
    return { ok: false, reason: 'grief_at_low_mood' };
  }
  if (level !== 'none' && Number(item.energy) > CRISIS_MAX_ENERGY) return { ok: false, reason: 'crisis_gentle_only' };
  return { ok: true, reason: 'approved' };
}

/** Content note shown on the card (null when none). */
export function careContentNote(item, locale = 'it') {
  if (!APPROVED_CARE_ITEMS[String(item?.id || '')]?.grief) return null;
  return locale === 'it' ? 'Tocca il tema della perdita, con delicatezza.' : 'Touches on loss, gently.';
}

/**
 * The card's note without promises of effect: the curated notes open with
 * «Utile per…» / «Helpful…» (a benefit claim); only the description is shown.
 */
export function publicCareNote(note) {
  const s = String(note || '').trim();
  const m = s.match(/^(Utile|Helpful|Useful)\b[^.!?]*[.!?]\s*(.*)$/s);
  return (m ? m[2] : s).trim();
}
